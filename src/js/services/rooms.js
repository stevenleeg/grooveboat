import {createAction} from 'utils/redux';
import {takeEvery, put, call} from 'redux-saga/effects';
import Immutable from 'immutable';

import {
  send,
  takeRPC,
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

  BECOME_DJ: 'services/rooms/become_dj',
  BECOME_DJ_SUCCESS: 'services/rooms/become_dj_success',
  BECOME_DJ_FAILURE: 'services/rooms/become_dj_failure',

  SET_DJS: 'services/room/set_djs',
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

  becomeDj: createAction(ActionTypes.BECOME_DJ),
  becomeDjSuccess: createAction(ActionTypes.BECOME_DJ_SUCCESS),
  becomeDjFailure: createAction(ActionTypes.BECOME_DJ_FAILURE, 'message'),

  setPeers: createAction(ActionTypes.SET_PEERS, 'peers'),

  setDjs: createAction(ActionTypes.SET_DJS, 'djs'),
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
  },
  {
    actionType: ActionTypes.SET_DJS,
    callback: (s, {djs}) => s.setIn(['currentRoom', 'djs'], djs),
  },
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
const store = s => s.getIn(['services', 'rooms']);
const rooms = s => store(s).get('rooms');
const currentRoom = s => store(s).get('currentRoom');
const peerMap = (s) => {
  const room = currentRoom(s);
  if (!room) {
    return new Immutable.List();
  }

  return room.get('peers').reduce((map, peer) => {
    return map.set(peer.get('id'), peer);
  }, new Immutable.Map());
};
const djs = (s) => {
  const room = currentRoom(s);
  if (!room) {
    return new Immutable.List();
  }

  const peers = peerMap(s);
  return room.get('djs').map((peerId) => {
    return peers.get(peerId);
  });
};
const audience = (s) => {
  const room = currentRoom(s);
  if (!room) {
    return new Immutable.List();
  }

  const djs = room.get('djs').toSet();
  return currentRoom(s).get('peers').filter(p => !djs.has(p.get('id')));
};

export const Selectors = {
  store,
  rooms,
  currentRoom,
  peerMap,
  djs,
  audience,
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

function* becomeDj() {
  const resp = yield call(send, {name: 'becomeDj'});

  if (resp.error) {
    yield put(Actions.becomeDjFailure({message: resp.message}));
    return;
  }

  yield put(Actions.becomeDjSuccess());
}

export function* Saga() {
  yield takeEvery(ActionTypes.FETCH_ALL, fetchAll);
  yield takeEvery(ActionTypes.CREATE_ROOM, createRoom);
  yield takeEvery(ActionTypes.JOIN_ROOM, joinRoom);
  yield takeEvery(ActionTypes.BECOME_DJ, becomeDj);

  yield* takeRPC('setPeers', Actions.setPeers);
  yield* takeRPC('setDjs', Actions.setDjs);
}
