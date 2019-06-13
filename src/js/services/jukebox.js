import Immutable from 'immutable';
import {takeEvery, call} from 'redux-saga/effects';

import {createAction} from 'utils/redux';
import {rpcToAction} from './buoys';

////
// Helpers
//
const player = new Audio();
window.player = player;

////
// Actions
//
export const ActionTypes = {
  PLAY_TRACK: 'services/jukebox/play_track',
};

export const Actions = {
  playTrack: createAction(ActionTypes.PLAY_TRACK, 'track'),
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
function* playTrack({track}) {
  const file = yield call(window.ipfs.cat, track.get('ipfsHash'));
  player.src = `data:audio/mp3;base64,${file.toString('base64')}`;
  player.currentTime = 0;
  player.load();
  player.play();
}

export function* Saga() {
  yield takeEvery(ActionTypes.PLAY_TRACK, playTrack);

  yield rpcToAction('playTrack', Actions.playTrack);
}
