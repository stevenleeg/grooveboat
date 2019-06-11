import io from 'socket.io-client';
import Immutable from 'immutable';
import JWT from 'jsonwebtoken';

let currentSocket = null;

////
// Actions
//
export const fetchAll = ({state, setState}) => {
  setState({...state.store, loadingSaved: true});
  console.log('fetching rooms');

  // connect to db, search for saved servers, etc.
  
  setTimeout(() => {
    setState({...state.store, loadingSaved: false});
  }, 500);
};

export const connect = async (store, {invite}) => {
  setState({...state.store, loadingServer: true});

  try {
    await connect(store, {invite});
  } catch (e) {
    setState({...state.store, loadingServer: false});
    return;
  }

  send({name: 'fetchRooms'});
};

////
// Helpers
//
const connect = (store, {invite}) => {
  const p = Promise.new();

  const token = JWT.decode(invite);
  currentSocket = io(url);

  currentSocket.on('connect', () => {
    p.resolve();
    console.log('connected!');
    send({
      name: 'authenticate',
      params: {invite},
    });
  });

  currentSocket.on('disconnect', () => {
    p.reject();
    console.log('disconnected...');
  });

  return p;
};

const send = ({name, params}) => {
  if (!currentSocket) {
    throw "Socket not connected";
  }

  currentSocket.emit('call', {name, params});
};

export const initialState = () => ({
  loadingSaved: false,
  loadingServer: false,
  saved: [],
  currentRoom: null,
});
