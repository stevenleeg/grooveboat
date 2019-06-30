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
  PLAY_TRACK: 'services/jukebox/play_track',
  PLAY_TRACK_FAILURE: 'services/jukebox/play_track_failure',
  PLAY_TRACK_SUCCESS: 'services/jukebox/play_track_success',
  STOP_TRACK: 'services/jukebox/stop_track',
  TRACK_ENDED: 'services/jukebox/track_ended',
  TRACK_CAN_PLAY: 'services/jukebox/track_can_play',
  TRACK_SEEKED: 'services/jukebox/track_seeked',
  SET_VOTES: 'services/jukebox/set_votes',
};

export const Actions = {
  playTrack: createAction(ActionTypes.PLAY_TRACK, 'track'),
  playTrackFailure: createAction(ActionTypes.PLAY_TRACK_FAILURE, 'message'),
  playTrackSuccess: createAction(ActionTypes.PLAY_TRACK_SUCCESS, 'track'),
  stopTrack: createAction(ActionTypes.STOP_TRACK),
  trackEnded: createAction(ActionTypes.TRACK_ENDED, 'track'),
  trackCanPlay: createAction(ActionTypes.TRACK_CAN_PLAY),
  trackSeeked: createAction(ActionTypes.TRACK_SEEKED),
  setVotes: createAction(ActionTypes.SET_VOTES, 'votes'),
};

////
// Reducer
//
const initialState = Immutable.fromJS({
  currentTrack: null,
  trackStartedAt: null,
  loadingTrack: false,
});

const callbacks = [
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
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
const store = s => s.getIn(['services', 'jukebox']);
const currentTrack = s => store(s).get('currentTrack');
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
  const TRACK_DELAY = 1; // in seconds
  while (true) {
    // Make sure the track is the same
    track = yield select(currentTrack);
    if (!track || track.get('id') !== trackId) {
      return;
    }

    const now = (+new Date()) / 1000;
    const seekTo = (now - (startedAt + TRACK_DELAY));
    // If we're more than 1.5 seconds off let's do a quick seek
    if (Math.abs(player.seek() - seekTo) > 1.5) {
      console.log('syncing playhead'); // eslint-disable-line no-console
      player.pause(currentId);
      player.seek(seekTo, currentId);
      player.play(currentId);
    }
    yield delay(3000);
  }
}

function* playTrack({track}) {
  // Try to prevent two tracks from overlapping
  if (player !== null) {
    yield cancel(player.endTask);
    yield cancel(player.syncTask);
    player.stop();
  }

  player = new Howl({
    src: [track.get('url')],
    format: ['mp3'],
    html5: false,
  });

  // Useful for debugging
  window.player = player;

  const {timeout, canceled} = yield race({
    timeout: delay(25 * 1000),
    loaded: call(awaitLoad),
    canceled: take(ActionTypes.PLAY_TRACK),
  });

  if (timeout) {
    yield put(ToasterActions.notify({
      title: 'timeout',
      message: 'looks like this track isn\'t loading properly. hang tight or refresh.',
      icon: '🤔',
    }));
    return;
  }
  if (canceled) {
    // Some other track started getting played before we had a chance to load
    // this one
    return;
  }

  yield put(Actions.playTrackSuccess({
    track: track.merge({
      duration: player.duration(),
    }),
  }));

  player.endTask = yield fork(listenForEnd);
  player.syncTask = yield fork(syncTrack);
  currentId = player.play();
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

export function* Saga() {
  yield takeEvery(ActionTypes.PLAY_TRACK, playTrack);
  yield takeEvery(ActionTypes.TRACK_ENDED, trackEnded);
  yield takeEvery(ActionTypes.STOP_TRACK, stopTrack);

  yield* rpcToAction('playTrack', Actions.playTrack);
  yield* rpcToAction('setVotes', Actions.setVotes);
  yield* rpcToAction('stopTrack', Actions.stopTrack);
}
