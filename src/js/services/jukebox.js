import Immutable from 'immutable';
import {takeEvery, fork, take, race, call, select, put, cancel, delay} from 'redux-saga/effects';
import {Howl} from 'howler';

import {createAction} from '../utils/redux';
import {send, rpcToAction} from './buoys';
import {Actions as ToasterActions} from './toaster';

////
// Helpers
//
let player = null;
let onDeckPlayer = null;
let currentId = -1;

const awaitEnd = () => {
  return new Promise((resolve) => {
    player.once('end', () => resolve());
  });
};

const awaitLoad = () => {
  return new Promise((resolve) => {
    player.once('load', () => resolve());
  });
};

////
// Actions
//
export const ActionTypes = {
  SET_ON_DECK: 'services/jukebox/set_on_deck',
  PLAY_TRACK: 'services/jukebox/play_track',
  PLAY_TRACK_FAILURE: 'services/jukebox/play_track_failure',
  PLAY_TRACK_SUCCESS: 'services/jukebox/play_track_success',
  STOP_TRACK: 'services/jukebox/stop_track',
  TRACK_ENDED: 'services/jukebox/track_ended',
  TRACK_CAN_PLAY: 'services/jukebox/track_can_play',
  TRACK_SEEKED: 'services/jukebox/track_seeked',
  SET_VOTES: 'services/jukebox/set_votes',
  SET_MUTE: 'services/jukebox/set_mute',
};

export const Actions = {
  setOnDeck: createAction(ActionTypes.SET_ON_DECK, 'track'),
  playTrack: createAction(ActionTypes.PLAY_TRACK, 'track'),
  playTrackFailure: createAction(ActionTypes.PLAY_TRACK_FAILURE, 'message'),
  playTrackSuccess: createAction(ActionTypes.PLAY_TRACK_SUCCESS, 'track'),
  stopTrack: createAction(ActionTypes.STOP_TRACK),
  trackEnded: createAction(ActionTypes.TRACK_ENDED, 'track'),
  trackCanPlay: createAction(ActionTypes.TRACK_CAN_PLAY),
  trackSeeked: createAction(ActionTypes.TRACK_SEEKED),
  setVotes: createAction(ActionTypes.SET_VOTES, 'votes'),
  setMute: createAction(ActionTypes.SET_MUTE, 'mute'),
};

////
// Reducer
//
const initialState = Immutable.fromJS({
  currentTrack: null,
  onDeckTrack: null,
  loadingOnDeck: false,
  loadingTrack: false,
  mute: false,
});

const callbacks = [
  {
    actionType: ActionTypes.SET_ON_DECK,
    callback: (s, {track}) => {
      return s.merge({onDeckTrack: track});
    },
  },
  {
    actionType: ActionTypes.PLAY_TRACK,
    callback: (s, {track, votes, startedAt}) => {
      return s
        .merge({currentTrack: track, loadingTrack: true})
        .setIn(['currentTrack', 'votes'], votes)
        .setIn(['currentTrack', 'startedAt'], startedAt);
    },
  },
  {
    actionType: ActionTypes.PLAY_TRACK_SUCCESS,
    callback: (s, {track}) => {
      return s.merge({currentTrack: track, loadingTrack: false});
    },
  },
  {
    actionType: ActionTypes.STOP_TRACK,
    callback: (s) => {
      return s.merge({currentTrack: null});
    },
  },
  {
    actionType: ActionTypes.SET_VOTES,
    callback: (s, {votes}) => {
      return s.setIn(['currentTrack', 'votes'], votes);
    },
  },
  {
    actionType: ActionTypes.SET_MUTE,
    callback: (s, {value}) => {
      return s.merge({mute: value});
    },
  },
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
const store = s => s.getIn(['services', 'jukebox']);
const currentTrack = s => store(s).get('currentTrack');
const onDeckTrack = s => store(s).get('onDeckTrack');
const mute = s => store(s).get('mute');
const loadingTrack = s => store(s).get('loadingTrack');
const voteCounts = (s) => {
  const track = currentTrack(s);
  if (!track || !track.get('votes')) {
    return {upCount: 0, downCount: 0};
  }

  const votes = track.get('votes');
  return votes.keySeq().reduce(({upCount, downCount}, peerId) => {
    if (votes.get(peerId)) {
      return {upCount: upCount + 1, downCount};
    }
    return {upCount, downCount: downCount + 1};
  }, {upCount: 0, downCount: 0});
};

export const Selectors = {
  store,
  currentTrack,
  voteCounts,
  loadingTrack,
  mute,
};

///
// Sagas
//
function* listenForEnd() {
  yield call(awaitEnd);

  const track = yield select(currentTrack);
  yield put(Actions.trackEnded({track}));
}

// Syncs the current track's playhead with the server-provided started at time
function* syncTrack() {
  let track = yield select(currentTrack);
  const trackId = track.get('id');
  const startedAt = track.get('startedAt');

  // Give some time to buffer
  while (true) {
    // Make sure the track is the same
    track = yield select(currentTrack);
    if (!track || track.get('id') !== trackId) {
      return;
    }

    const now = (+new Date()) / 1000;
    const seekTo = (now - (startedAt));
    // If we're more than 1.5 seconds off let's do a quick seek
    const diff = Math.abs(player.seek() - seekTo);
    if (diff > 1.5) {
      console.log(`syncing playhead (diff: ${diff}`); // eslint-disable-line no-console
      player.pause(currentId);
      player.seek(seekTo, currentId);
      player.play(currentId);
    }
    yield delay(3000);
  }
}

function setOnDeck({track}) {
  if (!track) {
    return;
  }

  onDeckPlayer = new Howl({
    src: [track.get('url')],
    format: ['mp3'],
  });
}

function* playTrack({startedAt, track}) {
  // Try to prevent two tracks from overlapping
  if (player !== null) {
    yield cancel(player.endTask);
    yield cancel(player.syncTask);
    player.stop();
  }

  // Have we been preloading this track?
  const onDeck = yield select(onDeckTrack);
  if (onDeck && onDeck.get('id') === track.get('id')) {
    player = onDeckPlayer;
    onDeckPlayer = null;
  } else {
    player = new Howl({
      src: [track.get('url')],
      format: ['mp3'],
    });
  }

  // Should we mute?
  const shouldMute = yield select(mute);
  if (shouldMute) {
    player.mute(true);
  }

  // Useful for debugging
  window.player = player;

  // Do we need to wait for the file to finish loading?
  if (player.state() !== 'loaded') {
    // eslint-disable-next-line func-names
    const timeoutTask = yield fork(function* () {
      yield delay(25 * 1000);
      yield put(ToasterActions.notify({
        title: 'timeout',
        message: 'looks like this track isn\'t loading properly. hang tight or refresh.',
        icon: '🤔',
      }));
    });

    const {canceled, stopped} = yield race({
      loaded: call(awaitLoad),
      canceled: take(ActionTypes.PLAY_TRACK),
      stopped: take(ActionTypes.STOP_TRACK),
    });

    yield cancel(timeoutTask);

    if (canceled || stopped) {
      // Some other track started getting played before we had a chance to load
      // this one
      return;
    }
  }

  // The server will give us a few extra seconds to download the track, so if
  // we end early let's delay for a bit so we don't need to seek
  const now = (+new Date()) / 1000;
  if (now - startedAt < 0) {
    yield delay((startedAt - now) * 1000);
  }

  yield put(Actions.playTrackSuccess({
    track: track.merge({
      duration: player.duration(),
      startedAt,
    }),
  }));

  currentId = player.play();
  player.endTask = yield fork(listenForEnd);
  player.syncTask = yield fork(syncTrack);
}

function* trackEnded() {
  yield cancel(player.endTask);
  yield cancel(player.syncTask);
  yield call(send, {name: 'trackEnded'});
}

function* stopTrack() {
  yield cancel(player.endTask);
  yield cancel(player.syncTask);
  player.stop();
}

function setMute({value}) {
  if (player) {
    player.mute(value);
  }
}

export function* Saga() {
  yield takeEvery(ActionTypes.PLAY_TRACK, playTrack);
  yield takeEvery(ActionTypes.TRACK_ENDED, trackEnded);
  yield takeEvery(ActionTypes.STOP_TRACK, stopTrack);
  yield takeEvery(ActionTypes.SET_MUTE, setMute);
  yield takeEvery(ActionTypes.SET_ON_DECK, setOnDeck);

  yield* rpcToAction('playTrack', Actions.playTrack);
  yield* rpcToAction('setVotes', Actions.setVotes);
  yield* rpcToAction('stopTrack', Actions.stopTrack);
  yield* rpcToAction('setOnDeck', Actions.setOnDeck);
}
