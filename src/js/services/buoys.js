import Immutable from 'immutable';
import {createAction} from 'utils/redux';
import {fork, takeEvery, put, call, take} from 'redux-saga/effects';
import {delay, eventChannel, END} from 'redux-saga';
import JWT from 'jsonwebtoken';
import io from 'socket.io-client';

import db from 'db';

let socket = null;

const openSocket = ({url}) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject({error: true, message: 'connection timed out'});
    }, 3000);

    socket = io(url);
    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
};

const listenToSocket = () => {
  return eventChannel((emit) => {
    socket.on('call', (payload, callback) => {
      emit({payload, callback});
    });
    socket.on('disconnect', () => emit(END));

    return () => socket.disconnect();
  });
};

export const send = ({name, params}) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject({error: true, message: 'client: msg timeout'});
    }, 5000);

    socket.emit('call', {name, params}, (resp) => {
      clearTimeout(timeout);
      resolve(resp);
    });
  });
};

////
// Actions
//
export const ActionTypes = {
  FETCH_BUOYS: 'services/buoys/fetch_buoys',
  FETCH_BUOYS_SUCCESS: 'services/buoys/fetch_buoys_success',

  JOIN: 'services/buoy/join',
  JOIN_SUCCESS: 'services/buoy/join_success',
  JOIN_FAILURE: 'services/buoy/join_failure',

  CONNECT: 'services/buoy/connect',
  CONNECT_SUCCESS: 'services/buoy/connect_success',
  CONNECT_FAILURE: 'services/buoy/connect_failure',

  DISCONNECTED: 'services/buoy/disconnected',

  RECEIVE: 'services/buoy/receive',
};

export const Actions = {
  join: createAction(ActionTypes.JOIN, 'inviteCode'),
  joinSuccess: createAction(ActionTypes.JOIN_SUCCESS, 'buoy'),
  joinFailure: createAction(ActionTypes.JOIN_FAILURE, 'error'),

  connect: createAction(ActionTypes.CONNECT, 'buoy'),
  connectSuccess: createAction(ActionTypes.CONNECT_SUCCESS, 'buoy'),
  connectFailure: createAction(ActionTypes.CONNECT_FAILURE),

  receive: createAction(ActionTypes.RECEIVE, 'payload', 'callback'),

  disconnected: createAction(ActionTypes.DISCONNECTED),

  fetchBuoys: createAction(ActionTypes.FETCH_BUOYS),
  fetchBuoysSuccess: createAction(ActionTypes.FETCH_BUOYS_SUCCESS, 'buoys'),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  connecting: false,
  connectedBuoy: null,
  buoys: [],
  peerId: null,
});

const callbacks = [
  {
    actionType: ActionTypes.JOIN,
    callback: s => s.merge({connectedBuoy: null, connecting: true}),
  },
  {
    actionType: ActionTypes.JOIN_SUCCESS,
    callback: (s, {buoy, peerId}) => s.merge({
      peerId,
      connectedBuoy: buoy,
      buoys: s.get('buoys').push(buoy),
      connecting: false,
    }),
  },
  {
    actionType: ActionTypes.JOIN_FAILURE,
    callback: s => s.merge({connecting: false}),
  },

  {
    actionType: ActionTypes.CONNECT,
    callback: s => s.merge({connectedBuoy: null, connecting: true}),
  },
  {
    actionType: ActionTypes.CONNECT_SUCCESS,
    callback: (s, {buoy, peerId}) => s.merge({
      peerId,
      connectedBuoy: buoy,
      connecting: false,
    }),
  },
  {
    actionType: ActionTypes.CONNECT_FAILURE,
    callback: (s, {buoy}) => {
      const buoyIndex = s.get('buoys').findIndex(b => b.get('_id') === buoy.get('_id'));
      const updatedBuoys = s.get('buoys').delete(buoyIndex);

      return s.merge({
        connecting: false,
        connectedBuoy: null,
        buoys: updatedBuoys,
      });
    },
  },

  {
    actionType: ActionTypes.DISCONNECTED,
    callback: s => s.merge({connectedBuoy: null, connecting: false}),
  },

  {
    actionType: ActionTypes.FETCH_BUOYS_SUCCESS,
    callback: (s, {buoys}) => s.merge({buoys}),
  },
  {
    actionType: ActionTypes.SET_BUOYS,
    callback: (s, {buoys}) => s.merge({buoys}),
  },
];

export const Reducers = {initialState, callbacks}

////
// Selectors
//
export const Selectors = {
  store: s => s.getIn(['services', 'buoys']),
  buoys: s => s.getIn(['services', 'buoys', 'buoys']),
  connectedBuoy: s => s.getIn(['services', 'buoys', 'connectedBuoy']),
  isConnecting: s => s.getIn(['services', 'buoys', 'connecting']),
  peerId: s => s.getIn(['services', 'buoys', 'peerId']),
};

////
// Sagas
//
function* join({inviteCode}) {
  const token = JWT.decode(inviteCode);
  yield call(openSocket, {url: token.u});

  const resp = yield call(send, {
    name: 'join',
    params: {jwt: inviteCode},
  });

  if (!resp.token) {
    yield put(Actions.joinFailure());
    return;
  }

  const buoy = {
    url: token.u,
    name: token.n,
    token: resp.token,
  };

  let store;
  try {
    store = yield call(db.get, 'buoys');
  } catch (e) {
    if (e.status !== 404) {
      throw e;
      return;
    }

    store = Immutable.fromJS({
      _id: 'buoys',
      buoys: [],
    });
  }

  const updatedStore = store.merge({
    buoys: store.get('buoys').push(buoy),
  });

  yield call(db.put, updatedStore);
  yield fork(listen);
  yield put(Actions.joinSuccess({
    token: resp.token,
    buoy: Immutable.fromJS(buoy),
    peerId: resp.peerId,
  }));
};

function* connect({buoy}) {
  const token = JWT.decode(buoy.get('token'));
  try {
    yield call(openSocket, {url: token.u});
  } catch (e) {
    yield put(Actions.connectFailure({message: e.message, buoy}));
    return;
  }

  const resp = yield call(send, {
    name: 'authenticate',
    params: {jwt: buoy.get('token')},
  });

  if (!resp.success) {
    yield put(Actions.connectFailure({...resp, buoy}));
  }

  yield fork(listen);
  yield put(Actions.connectSuccess({buoy, peerId: resp.peerId}));
}

function* connectFailure({buoy}) {
  let store;
  try {
    store = yield call(db.get, 'buoys');
  } catch (e) {
    console.log('could not remove bad buoy');
    return;
  }

  const buoyIndex = store.get('buoys')
    .findIndex(b => b.get('_id') === buoy.get('id'));

  if (buoyIndex !== -1) {
    const updatedStore = store.deleteIn(['buoys', buoyIndex]);
    yield call(db.put, updatedStore);
    console.log('removing bad buoy ', buoy.get('_id'));
  }
}

function* listen() {
  const messageChannel = yield call(listenToSocket);
  try {
    while (true) {
      const {payload, callback} = yield take(messageChannel);
      yield put(Actions.receive({...payload, callback}));
    }
  } finally {
    console.log('Connection closed');
    yield put(Actions.disconnected());
  }
}

function* fetchBuoys() {
  let buoys;
  try {
    const store = yield call(db.get, 'buoys');
    buoys = store.get('buoys');
  } catch (e) {
    if (e.status !== 404) {
      throw e;
      return;
    }

    buoys = new Immutable.List();
  }

  yield put(Actions.fetchBuoysSuccess({buoys}));
}

export function* rpcToAction(name, actionCreator) {
  yield takeEvery(({type, name: incName}) => {
    return type === ActionTypes.RECEIVE && name === incName;
  }, function*({params, callback}) {
    const keys = Object.keys(params);
    const immutable = keys.reduce((map, key) => {
      return {...map, [key]: Immutable.fromJS(params[key])};
    }, {});

    yield put(actionCreator({...immutable, callback}));
  });
}

export function* Saga() {
  yield takeEvery(ActionTypes.JOIN, join);
  yield takeEvery(ActionTypes.CONNECT, connect);
  yield takeEvery(ActionTypes.CONNECT_FAILURE, connectFailure);
  yield takeEvery(ActionTypes.FETCH_BUOYS, fetchBuoys);
}
