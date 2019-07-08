import {takeEvery, put, call, take} from 'redux-saga/effects';

import {
  Actions as BuoyActions,
  ActionTypes as BuoyActionTypes,
} from '../../services/buoys';
import {
  Actions as RoomActions,
  ActionTypes as RoomActionTypes,
} from '../../services/rooms';
import {createAction} from '../../utils/redux';

////
// Actions
//
export const ActionTypes = {
  INIT: 'pages/room-selector/init',
  JOIN_BUOY: 'pages/room-selector/join-buoy',
  CREATE_ROOM: 'pages/room-selector/create-room',
};

export const Actions = {
  init: createAction(ActionTypes.INIT),
  joinBuoy: createAction(ActionTypes.JOIN_BUOY, 'inviteCode'),
  createRoom: createAction(ActionTypes.CREATE_ROOM, 'name', 'callback'),
};

////
// Sagas
//
function* joinBuoy({inviteCode, callback}) {
  yield put(BuoyActions.join({inviteCode}));

  const {type} = yield take([
    BuoyActionTypes.JOIN_SUCCESS,
    BuoyActionTypes.JOIN_FAILURE,
  ]);

  if (type === BuoyActionTypes.JOIN_FAILURE) {
    return;
  }

  // Fetch the rooms in the buoy
  yield put(RoomActions.fetchAll());
  if (callback) {
    yield call(callback);
  }
}

function* init() {
  yield put(BuoyActions.fetchBuoys());

  const {buoys} = yield take(BuoyActionTypes.FETCH_BUOYS_SUCCESS);
  if (process.env.DEFAULT_INVITE) {
    // Do we have a default buoy to go with?
    yield* joinBuoy({inviteCode: process.env.DEFAULT_INVITE});
    return;
  }
  if (buoys.count() === 0 && !process.env.DEFAULT_INVITE) {
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

function* createRoom({name, callback}) {
  yield put(RoomActions.createRoom({name}));

  const {type, room} = yield take([
    RoomActionTypes.CREATE_ROOM_SUCCESS,
    RoomActionTypes.CREATE_ROOM_FAILURE,
  ]);

  if (type === RoomActionTypes.CREATE_ROOM_FAILURE) {
    return;
  }

  yield call(callback, {room});
}

export function* Saga() {
  yield takeEvery(ActionTypes.INIT, init);
  yield takeEvery(ActionTypes.JOIN_BUOY, joinBuoy);
  yield takeEvery(ActionTypes.CREATE_ROOM, createRoom);
}
