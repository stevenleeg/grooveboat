import Immutable from 'immutable';
import {takeEvery, fork, call, select, put, cancel, delay} from 'redux-saga/effects';
import {Howl} from 'howler';

import {createAction} from '../utils/redux';
import {send, rpcToAction} from './buoys';

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

////
// Actions
//
export const ActionTypes = {
  PLAY_TRACK: 'services/jukebox/play_track',
  PLAY_TRACK_FAILURE: 'services/jukebox/play_track_failure',
  STOP_TRACK: 'services/jukebox/stop_track',
  TRACK_ENDED: 'services/jukebox/track_ended',
  TRACK_CAN_PLAY: 'services/jukebox/track_can_play',
  TRACK_SEEKED: 'services/jukebox/track_seeked',
  SET_VOTES: 'services/jukebox/set_votes',
};

export const Actions = {
  playTrack: createAction(ActionTypes.PLAY_TRACK, 'track'),
  playTrackFailure: createAction(ActionTypes.PLAY_TRACK_FAILURE, 'message'),
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
});

const callbacks = [
  {
    actionType: ActionTypes.PLAY_TRACK,
    callback: (s, {track, votes}) => {
      return s
        .merge({currentTrack: track})
        .setIn(['currentTrack', 'votes'], votes);
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
};

///
// Sagas
//
function* listenForEnd() {
  yield call(awaitEnd);

  const track = yield select(currentTrack);
  yield put(Actions.trackEnded({track}));
}

function* playTrack({startedAt, track}) {
  player = new Howl({
    src: [track.get('url')],
    format: ['mp3'],
    html5: false,
  });

  // Useful for debugging
  window.player = player;

  // Delay for 3 seconds to buffer the track
  const BUFFER = 3;
  yield delay(BUFFER * 1000);

  player.task = yield fork(listenForEnd);
  currentId = player.play();

  // Schedule two syncing events
  yield delay(350);
  for (let i = 0; i < 2; i += 1) {
    const now = (+new Date()) / 1000;
    const seekTo = (now - (startedAt + BUFFER));
    if (Math.abs(player.seek() - seekTo) > 1.5) {
      player.pause(currentId);
      player.seek(seekTo, currentId);
      player.play(currentId);
    }
    yield delay(3000);
  }
}

function* trackEnded() {
  yield cancel(player.task);
  yield call(send, {name: 'trackEnded'});
}

function* stopTrack() {
  yield cancel(player.task);
  player.pause();
}

export function* Saga() {
  yield takeEvery(ActionTypes.PLAY_TRACK, playTrack);
  yield takeEvery(ActionTypes.TRACK_ENDED, trackEnded);
  yield takeEvery(ActionTypes.STOP_TRACK, stopTrack);

  yield* rpcToAction('playTrack', Actions.playTrack);
  yield* rpcToAction('setVotes', Actions.setVotes);
  yield* rpcToAction('stopTrack', Actions.stopTrack);
}
