import {createAction} from 'utils/redux';
import {takeEvery, put, call} from 'redux-saga/effects';
import Immutable from 'immutable';

import {send} from './buoys';

////
// Actions
//
export const ActionTypes = {
  FETCH_ALL: 'services/rooms/fetch_all',
  FETCH_ALL_SUCCESS: 'services/rooms/fetch_all_success',
};

export const Actions = {
  fetchAll: createAction(ActionTypes.FETCH_ALL),
  fetchAllSuccess: createAction(ActionTypes.FETCH_ALL_SUCCESS, 'rooms'),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  loading: false,
  rooms: [],
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
];

export const Reducers = {initialState, callbacks};

////
// Selectors
//
export const Selectors = {
  store: s => s.getIn(['services', 'rooms']),
  rooms: s => s.getIn(['services', 'rooms', 'rooms']),
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

export function* Saga() {
  yield takeEvery(ActionTypes.FETCH_ALL, fetchAll);
}
