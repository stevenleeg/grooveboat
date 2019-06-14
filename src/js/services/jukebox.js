import Immutable from 'immutable';
import {takeEvery, call, take, select, put} from 'redux-saga/effects';
import {eventChannel} from 'redux-saga';

import {createAction} from 'utils/redux';
import {send, rpcToAction} from './buoys';

////
// Helpers
//
const player = new Audio();
window.player = player;

const playerChannel = () => {
  return eventChannel((emit) => {
    const handler = () => emit({event: 'ended'});

    player.addEventListener('ended', handler);

    return () => {
      player.removeEventListener('ended', handler);
      player.pause();
    };
  });
};

////
// Actions
//
export const ActionTypes = {
  PLAY_TRACK: 'services/jukebox/play_track',
  STOP_TRACK: 'services/jukebox/stop_track',
  TRACK_ENDED: 'services/jukebox/track_ended',
};

export const Actions = {
  playTrack: createAction(ActionTypes.PLAY_TRACK, 'track'),
  stopTrack: createAction(ActionTypes.STOP_TRACK),
  trackEnded: createAction(ActionTypes.TRACK_ENDED, 'track'),
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
function* init() {
  const playerEvents = yield call(playerChannel);

  while (true) {
    const {event} = yield take(playerEvents);

    if (event === 'ended') {
      const track = yield select(currentTrack);
      yield put(Actions.trackEnded({track}));
    }
  }
}

function* playTrack({track}) {
  const file = yield call(window.ipfs.cat, track.get('ipfsHash'));
  player.src = `data:audio/mp3;base64,${file.toString('base64')}`;
  player.currentTime = 0;
  player.load();
  player.play();
}

function* trackEnded({track}) {
  yield call(send, {name: 'trackEnded'});
}

function* stopTrack() {
  player.pause();
}

export function* Saga() {
  yield takeEvery('init', init);
  yield takeEvery(ActionTypes.PLAY_TRACK, playTrack);
  yield takeEvery(ActionTypes.TRACK_ENDED, trackEnded);
  yield takeEvery(ActionTypes.STOP_TRACK, stopTrack);

  yield* rpcToAction('playTrack', Actions.playTrack);
  yield* rpcToAction('stopTrack', Actions.stopTrack);
}
