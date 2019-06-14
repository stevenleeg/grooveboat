import Immutable from 'immutable';
import {takeEvery, put, delay} from 'redux-saga/effects';
import {createAction} from 'utils/redux';

////
// Actions
//
export const ActionTypes = {
  NOTIFY: 'services/toaster/notify',
  CLEAR_NOTIFICATION: 'services/toaster/clear_notification',
};

export const Actions = {
  notify: createAction(ActionTypes.NOTIFY, 'title', 'message', 'icon'),
  clearNotification: createAction(ActionTypes.CLEAR_NOTIFICATION),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  notifications: [],
});

const callbacks = [
  {
    actionType: ActionTypes.NOTIFY,
    callback: (s, {title, message, icon}) => {
      return s.merge({
        notifications: s.get('notifications').push(Immutable.fromJS({
          title,
          message,
          icon,
        })),
      });
    },
  },

  {
    actionType: ActionTypes.CLEAR_NOTIFICATION,
    callback: (s) => {
      return s.merge({
        notifications: s.get('notifications').shift(),
      });
    },
  },
];

export const Reducers = {initialState, callbacks};

const store = s => s.getIn(['services', 'toaster']);
const notifications = s => store(s).get('notifications');

export const Selectors = {
  notifications,
};

////
// Sagas
//
function* notify() {
  yield delay(4000);
  yield put(Actions.clearNotification());
}

function* init() {
  yield delay(1000);
  yield put(Actions.notify({
    title: 'Yeet!',
    message: 'Hello world',
  }));
}

export function* Saga() {
  yield takeEvery(ActionTypes.NOTIFY, notify);
  yield takeEvery('init', init);
}
