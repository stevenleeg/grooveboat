import Immutable from 'immutable';
import {takeEvery, fork, call, take, select, put, cancel} from 'redux-saga/effects';

import {createAction} from 'utils/redux';
import {send, rpcToAction} from './buoys';
import {Howl} from 'howler';

////
// Helpers
//
let player = null;

const awaitEnd = () => {
  return new Promise((resolve, reject) => {
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
    callback: (s, {track}) => {
      return s.merge({currentTrack: track});
    },
  },
  {
    actionType: ActionTypes.STOP_TRACK,
    callback: (s, {track}) => {
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

export const Selectors = {
  store,
  currentTrack,
};

///
// Sagas
//
function* listenForEnd() {
  yield call(awaitEnd);

  const track = yield select(currentTrack);
  yield put(Actions.trackEnded({track}))
}

function* playTrack({startedAt, track}) {
  window.player = player = new Howl({
    src: [track.get('url')],
    format: ['mp3'],
  });

  let seekTo = (+ new Date()) / 1000 - startedAt;
  if (seekTo >= 1) {
    player.once('play', () => {
      // Recalculate the seekTo
      player.seek((+ new Date()) / 1000 - startedAt)
    });
  }

  player.play();
  player.task = yield fork(listenForEnd);
}

function* trackEnded({track}) {
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
