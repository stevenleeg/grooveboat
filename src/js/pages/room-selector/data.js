import Immutable from 'immutable';
import {createAction} from 'utils/redux';
import {takeEvery, put, call, take} from 'redux-saga/effects';
import {delay, eventChannel, END} from 'redux-saga';

import {
  Selectors as BuoySelectors,
  Actions as BuoyActions,
  ActionTypes as BuoyActionTypes,
} from 'services/buoys';
import {
  Selectors as RoomSelectors,
  Actions as RoomActions,
  ActionTypes as RoomActionTypes,
} from 'services/rooms';

////
// Actions
//
export const ActionTypes = {
  INIT: 'pages/room-selector/init',

  JOIN_BUOY: 'pages/room-selector/join-buoy',
};

export const Actions = {
  init: createAction(ActionTypes.INIT),
  joinBuoy: createAction(ActionTypes.JOIN_BUOY, 'inviteCode'),
};

////
// Sagas
//
function* init() {
  yield put(BuoyActions.fetchBuoys());

  const {buoys} = yield take(BuoyActionTypes.FETCH_BUOYS_SUCCESS);
  if (buoys.count() === 0) {
    return;
  }

  yield put(BuoyActions.connect({buoy: buoys.get(0)}));
  const {type} = yield take([
    BuoyActionTypes.CONNECT_SUCCESS,
    BuoyActionTypes.CONNECT_FAILURE,
  ]);

  if (type === BuoyActionTypes.CONNECT_FAILURE) {
    return;
  }

  yield put(RoomActions.fetchAll());
}

function* joinBuoy({inviteCode}) {
  yield put(BuoyActions.join({inviteCode}));

  const {type, token} = yield take([
    BuoyActionTypes.JOIN_SUCCESS,
    BuoyActionTypes.JOIN_FAILURE,
  ]);

  if (type === BuoyActionTypes.JOIN_FAILURE) {
    return;
  }

  // Fetch the rooms in the buoy
}

export function* Saga() {
  yield takeEvery(ActionTypes.INIT, init);
  yield takeEvery(ActionTypes.JOIN_BUOY, joinBuoy);
}
