import {takeEvery, select, put, take} from 'redux-saga/effects';

import {
  Actions as RoomActions,
  ActionTypes as RoomActionTypes,
} from '../../services/rooms';
import {
  Selectors as BuoySelectors,
  Actions as BuoyActions,
  ActionTypes as BuoyActionTypes,
} from '../../services/buoys';
import {createAction} from '../../utils/redux';

////
// Actions
//
export const ActionTypes = {
  INIT: 'pages/room/init',
};

export const Actions = {
  init: createAction(ActionTypes.INIT, 'roomId', 'failureCallback'),
};

////
// Sagas
//
function* init({roomId, failureCallback}) {
  const connectedBuoy = yield select(BuoySelectors.connectedBuoy);
  if (!connectedBuoy) {
    yield put(BuoyActions.fetchBuoys());
    const {buoys} = yield take(BuoyActionTypes.FETCH_BUOYS_SUCCESS);

    // No buoys stored and there isn't a default to fallback to. Stop here.
    if (buoys.count() === 0 && !process.env.DEFAULT_INVITE) {
      return;
    }

    // No buoys stored but we have a fallback. Let's try to connect!
    if (buoys.count() === 0 && process.env.DEFAULT_INVITE) {
      yield put(BuoyActions.join({
        inviteCode: process.env.DEFAULT_INVITE,
      }));

      const {type, message} = yield take([
        BuoyActionTypes.JOIN_SUCCESS,
        BuoyActionTypes.JOIN_FAILURE,
      ]);

      if (type === BuoyActionTypes.JOIN_FAILURE) {
        failureCallback({message});
        return;
      }
    } else {
      // There's a buoy stored, let's go ahead and try to connect to it
      yield put(BuoyActions.connect({buoy: buoys.get(0)}));
      const {type, message} = yield take([
        BuoyActionTypes.CONNECT_SUCCESS,
        BuoyActionTypes.CONNECT_FAILURE,
      ]);

      if (type === BuoyActionTypes.CONNECT_FAILURE) {
        failureCallback({message});
        return;
      }
    }
  }

  // Join the room!
  yield put(RoomActions.joinRoom({id: roomId}));
  const {type, message} = yield take([
    RoomActionTypes.JOIN_ROOM_SUCCESS,
    RoomActionTypes.JOIN_ROOM_FAILURE,
  ]);

  if (type === RoomActionTypes.JOIN_ROOM_FAILURE) {
    failureCallback({message});
  }
}

export function* Saga() {
  yield takeEvery(ActionTypes.INIT, init);
}
