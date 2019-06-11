import {createAction} from 'utils/redux';
import {takeEvery, put, call} from 'redux-saga/effects';
import Immutable from 'immutable';

import {
  send,
  ActionTypes as BuoyActionTypes,
} from './buoys';

////
// Actions
//
export const ActionTypes = {
  FETCH_ALL: 'services/rooms/fetch_all',
  FETCH_ALL_SUCCESS: 'services/rooms/fetch_all_success',

  CREATE_ROOM: 'services/rooms/create_room',
  CREATE_ROOM_SUCCESS: 'services/rooms/create_room_success',
  CREATE_ROOM_FAILURE: 'services/rooms/create_room_failure',

  JOIN_ROOM: 'services/rooms/join_room',
  JOIN_ROOM_SUCCESS: 'services/rooms/join_room_success',
  JOIN_ROOM_FAILURE: 'services/rooms/join_room_failure',

  SET_PEERS: 'services/rooms/set_peers',
  TICK: 'services/rooms/tick',
};

export const Actions = {
  fetchAll: createAction(ActionTypes.FETCH_ALL),
  fetchAllSuccess: createAction(ActionTypes.FETCH_ALL_SUCCESS, 'rooms'),

  createRoom: createAction(ActionTypes.CREATE_ROOM, 'name'),
  createRoomSuccess: createAction(ActionTypes.CREATE_ROOM_SUCCESS, 'room'),
  createRoomFailure: createAction(ActionTypes.CREATE_ROOM_FAILURE, 'message'),

  joinRoom: createAction(ActionTypes.JOIN_ROOM, 'id'),
  joinRoomSuccess: createAction(ActionTypes.JOIN_ROOM_SUCCESS, 'room'),
  joinRoomFailure: createAction(ActionTypes.JOIN_ROOM_FAILURE, 'message'),

  setPeers: createAction(ActionTypes.SET_PEERS, 'peers'),
  tick: createAction(ActionTypes.TICK, 'tick'),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  loading: false,
  rooms: [],
  currentRoom: null,
});

const callbacks = [
  {
    actionType: ActionTypes.FETCH_ALL,
    callback: s => s.set('loading', true),
  },
  {
    actionType: ActionTypes.FETCH_ALL_SUCCESS,
    callback: (state, {rooms}) => {
      return state
        .set('saved', false)
        .merge({rooms});
    },
  },
  {
    actionType: ActionTypes.JOIN_ROOM_SUCCESS,
    callback: (s, {room}) => s.merge({currentRoom: room}),
  },
  {
    actionType: ActionTypes.SET_PEERS,
    callback: (s, {peers}) => s.setIn(['currentRoom', 'peers'], peers),
  }
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
export const Selectors = {
  store: s => s.getIn(['services', 'rooms']),
  rooms: s => s.getIn(['services', 'rooms', 'rooms']),
  currentRoom: s => s.getIn(['services', 'rooms', 'currentRoom']),
};

////
// Sagas
//
function* fetchAll() {
  const resp = yield call(send, {
    name: 'fetchRooms',
  });

  yield put(Actions.fetchAllSuccess({rooms: Immutable.fromJS(resp)}));
}

function* createRoom({name}) {
  const resp = yield call(send, {
    name: 'createRoom',
    params: {name},
  });

  if (resp.error) {
    yield put(Actions.createRoomFailure({message: resp.message}));
    return;
  }

  yield put(Actions.createRoomSuccess({room: Immutable.fromJS(resp)}));
}

function* joinRoom({id}) {
  const resp = yield call(send, {
    name: 'joinRoom',
    params: {id},
  });

  if (resp.error) {
    yield put(Actions.joinRoomFailure({message: resp.message}));
    return;
  }

  yield put(Actions.joinRoomSuccess({room: Immutable.fromJS(resp)}));
}

function* takeRPC(name, actionCreator) {
  yield takeEvery(({type, name: incName}) => {
    return type === BuoyActionTypes.RECEIVE && name === incName;
  }, function*({params}) {
    const keys = Object.keys(params);
    const immutable = keys.reduce((map, key) => {
      return {...map, [key]: Immutable.fromJS(params[key])};
    }, {});

    yield put(actionCreator(immutable));
  });
}

export function* Saga() {
  yield takeEvery(ActionTypes.FETCH_ALL, fetchAll);
  yield takeEvery(ActionTypes.CREATE_ROOM, createRoom);
  yield takeEvery(ActionTypes.JOIN_ROOM, joinRoom);

  yield* takeRPC('setPeers', Actions.setPeers);
  yield* takeRPC('tick', Actions.tick);
}
