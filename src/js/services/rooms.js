import {createAction} from 'utils/redux';
import {takeEvery, select, put, call} from 'redux-saga/effects';
import Immutable from 'immutable';

import db from 'db';
import {
  send,
  rpcToAction,
  rpcToSaga,
  ActionTypes as BuoyActionTypes,
  Selectors as BuoySelectors,
} from './buoys';
import {
  Selectors as LibrarySelectors
} from './library';
import {Actions as ToasterActions} from './toaster';

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

  STEP_DOWN: 'services/rooms/step_down',
  STEP_DOWN_SUCCESS: 'services/rooms/step_down_success',
  STEP_DOWN_FAILURE: 'services/rooms/step_down_failure',

  SET_DJS: 'services/room/set_djs',
  SET_ACTIVE_DJ: 'services/room/set_active_dj',

  SET_NEW_CHAT_MESSAGE: 'services/rooms/set_new_chat_message',
  SEND_CHAT: 'services/room/send_chat',
  SEND_CHAT_SUCCESS: 'services/room/send_chat_success',
  SEND_CHAT_FAILURE: 'services/room/send_chat_failure',
  NEW_CHAT_MESSAGE: 'services/rooms/new_chat_message',

  VOTE: 'services/rooms/vote',
  VOTE_SUCCESS: 'services/rooms/vote_success',
  VOTE_FAILURE: 'services/rooms/vote_failure',

  SET_PROFILE: 'services/rooms/set_profile',
  SET_PROFILE_SUCCESS: 'services/rooms/set_profile_success',
  SET_PROFILE_FAILURE: 'services/rooms/set_profile_failure',
  SET_PEER_PROFILE: 'services/room/set_peer_profile',

  SKIP_TURN: 'services/rooms/skip_turn',
  SKIP_TURN_SUCCESS: 'services/rooms/skip_turn_success',
  SKIP_TURN_FAILURE: 'services/rooms/skip_turn_failure',
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

  stepDown: createAction(ActionTypes.STEP_DOWN),
  stepDownSuccess: createAction(ActionTypes.STEP_DOWN_SUCCESS),
  stepDownFailure: createAction(ActionTypes.STEP_DOWN_FAILURE, 'message'),

  setNewChatMessage: createAction(ActionTypes.SET_NEW_CHAT_MESSAGE, 'message'),
  sendChat: createAction(ActionTypes.SEND_CHAT),
  sendChatSuccess: createAction(ActionTypes.SEND_CHAT_SUCCESS),
  sendChatFailure: createAction(ActionTypes.SEND_CHAT_FAILURE, 'message'),
  newChatMessage: createAction(ActionTypes.NEW_CHAT_MESSAGE),

  setPeers: createAction(ActionTypes.SET_PEERS, 'peers'),
  setDjs: createAction(ActionTypes.SET_DJS, 'djs'),
  setActiveDj: createAction(ActionTypes.SET_ACTIVE_DJ, 'djId'),

  vote: createAction(ActionTypes.VOTE, 'direction'),
  voteSuccess: createAction(ActionTypes.VOTE_SUCCESS),
  voteFailure: createAction(ActionTypes.VOTE_FAILURE, 'message'),

  setProfile: createAction(ActionTypes.SET_PROFILE, 'profile'),
  setProfileSuccess: createAction(ActionTypes.SET_PROFILE_SUCCESS),
  setProfileFailure: createAction(ActionTypes.SET_PROFILE_FAILURE, 'message'),
  setPeerProfile: createAction(ActionTypes.SET_PEER_PROFILE, 'id', 'profile'),

  skipTurn: createAction(ActionTypes.SKIP_TURN),
  skipTurnSuccess: createAction(ActionTypes.SKIP_TURN_SUCCESS),
  skipTurnFailure: createAction(ActionTypes.SKIP_TURN_FAILURE, 'message'),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  loading: false,
  rooms: [],
  chat: {
    messages: [],
    sendingMessage: false,
    newMessage: '',
  },
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
  {
    actionType: ActionTypes.SET_ACTIVE_DJ,
    callback: (s, {djId}) => s.setIn(['currentRoom', 'activeDj'], djId),
  },
  {
    actionType: ActionTypes.SET_NEW_CHAT_MESSAGE,
    callback: (s, {message}) => s.setIn(['chat', 'newMessage'], message),
  },
  {
    actionType: ActionTypes.SEND_CHAT,
    callback: s => s.setIn(['chat', 'sendingMessage'], true),
  },
  {
    actionType: ActionTypes.SEND_CHAT_FAILURE,
    callback: s => s.setIn(['chat', 'sendingMessage'], false),
  },
  {
    actionType: ActionTypes.SEND_CHAT_SUCCESS,
    callback: s => {
      return s
        .setIn(['chat', 'newMessage'], '')
        .setIn(['chat', 'sendingMessage'], false);
    },
  },
  {
    actionType: ActionTypes.NEW_CHAT_MESSAGE,
    callback: (s, {...message}) => {
      const updatedMsgs = s.getIn(['chat', 'messages'])
        .push(Immutable.fromJS(message));

      return s.setIn(['chat', 'messages'], updatedMsgs);
    },
  },
  {
    actionType: ActionTypes.SET_PEER_PROFILE,
    callback: (s, {id, profile}) => {
      const peerIndex = s.getIn(['currentRoom', 'peers'])
        .findIndex(peer => peer.get('id') === id);
      return s.setIn(['currentRoom', 'peers', peerIndex, 'profile'], profile);
    },
  }
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
const store = s => s.getIn(['services', 'rooms']);
const rooms = s => store(s).get('rooms');
const currentRoom = s => store(s).get('currentRoom');

const currentPeer = (s) => {
  const peerId = BuoySelectors.peerId(s);
  const room = currentRoom(s);
  const peerIndex = room.get('peers').findIndex(p => p.get('id') === peerId);
  return room.getIn(['peers', peerIndex]);
};
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

const newMessage = (s) => {
  return store(s).getIn(['chat', 'newMessage']);
};

const chatMessagesWithPeers = (s) => {
  const peers = peerMap(s);

  return store(s).getIn(['chat', 'messages']).map((msg) => {
    return msg
      .set('peer', peers.get(msg.get('fromPeerId')))
      .remove('fromPeerId');
  });
};

export const Selectors = {
  store,
  rooms,
  currentRoom,
  currentPeer,
  peerMap,
  djs,
  audience,
  newMessage,
  chatMessagesWithPeers,
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

  // Set our profile if we have one
  let profile;
  try {
    profile = yield call(db.get, 'profile');
  } catch (e) {
    if (e.status !== 404) {
      // Something went pretty wrong here...
      yield put(Actions.joinRoomFailure({message: e.message}));
      return;
    }
  }

  if (profile) {
    yield put(Actions.setProfile({
      profile: profile.deleteAll(['_id', '_rev']),
      save: false,
    }));
  }

  yield put(Actions.joinRoomSuccess({room: Immutable.fromJS(resp)}));
}

function* becomeDj() {
  // Make sure they have at least one track in their current playlist
  const currentQueue = yield select(LibrarySelectors.selectedQueueWithTracks);
  if (currentQueue.get('tracks').count() === 0) {
    yield put(Actions.becomeDjFailure({
      message: 'you need at least one track in your queue to become a dj',
    }));
    return;
  }

  const resp = yield call(send, {name: 'becomeDj'});

  if (resp.error) {
    yield put(Actions.becomeDjFailure({message: resp.message}));
    return;
  }

  yield put(Actions.becomeDjSuccess());
}

function* stepDown() {
  const resp = yield call(send, {name: 'stepDown'});

  if (resp.error) {
    yield put(Actions.stepDownFailure({message: resp.message}));
    return;
  }

  yield put(Actions.stepDownSuccess());
}

function* sendChat() {
  const message = yield select(newMessage);

  const resp = yield call(send, {
    name: 'sendChat',
    params: {message},
  });

  if (resp.error) {
    yield put(Actions.sendChatFailure({message: resp.message}));
    return;
  }

  yield put(Actions.sendChatSuccess());
}

function* vote({direction}) {
  const resp = yield call(send, {
    name: 'vote',
    params: {direction},
  });

  if (resp.error) {
    yield put(Actions.voteFailure({message: resp.message}));
    return;
  }

  yield put(Actions.voteSuccess());
}

function* setProfile({profile, save = true}) {
  const resp = yield call(send, {
    name: 'setProfile',
    params: {profile},
  });

  if (resp.error) {
    yield put(Actions.setProfileFailure({message: resp.message}));
    return;
  }

  if (save) {
    // Save the profile for later
    let dbProf;
    try {
      dbProf = yield call(db.get, 'profile');
    } catch (e) {
      if (e.status !== 404) {
        yield put(Actions.setProfileFailure({message: e.message}));
        return;
      }

      dbProf = profile.merge({_id: 'profile'});
    }

    const updatedProfile = dbProf.merge(profile);

    try {
      yield call(db.put, updatedProfile);
    } catch (e) {
      yield put(Actions.setProfileFailure({message: e.message}));
      return;
    }

    yield put(ToasterActions.notify({
      title: 'success',
      message: 'your profile has been updated',
      icon: '👍',
    }));
  }

  yield put(Actions.setProfileSuccess());
}

function* skipTurn() {
  const resp = yield call(send, {name: 'skipTurn'});
  
  if (resp.error) {
    yield put(Actions.skipTurnFailure({message: resp.message}));
    return;
  }

  yield put(Actions.skipTurnSuccess());
}

export function* Saga() {
  yield takeEvery(ActionTypes.FETCH_ALL, fetchAll);
  yield takeEvery(ActionTypes.CREATE_ROOM, createRoom);
  yield takeEvery(ActionTypes.JOIN_ROOM, joinRoom);
  yield takeEvery(ActionTypes.BECOME_DJ, becomeDj);
  yield takeEvery(ActionTypes.STEP_DOWN, stepDown);
  yield takeEvery(ActionTypes.SEND_CHAT, sendChat);
  yield takeEvery(ActionTypes.VOTE, vote);
  yield takeEvery(ActionTypes.SET_PROFILE, setProfile);
  yield takeEvery(ActionTypes.SKIP_TURN, skipTurn);

  yield* rpcToAction('setPeers', Actions.setPeers);
  yield* rpcToAction('setDjs', Actions.setDjs);
  yield* rpcToAction('setActiveDj', Actions.setActiveDj);
  yield* rpcToAction('newChatMsg', Actions.newChatMessage);
  yield* rpcToAction('setPeerProfile', Actions.setPeerProfile);
}
