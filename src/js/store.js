import React from 'react';
import Immutable from 'immutable';
import {createStore, applyMiddleware, compose} from 'redux';
import createSagaMiddleware from 'redux-saga';
import {createLogger} from 'redux-logger';

import rootReducer from './root-reducer';
import rootSaga from './root-saga';

const sagaMiddleware = createSagaMiddleware();
const logger = createLogger({
  collapsed: true,
  stateTransformer: s => s.toJS(),
});

const middleware = [
  logger,
  sagaMiddleware,
];

// Redux dev tool stuff
const composeEnhancers =
  typeof window === 'object' &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?   
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) : compose;

const enhancer = composeEnhancers(
  applyMiddleware(...middleware),
);

const store = createStore(
  rootReducer,
  enhancer,
);

sagaMiddleware.run(rootSaga);
store.dispatch({type: 'init'});

export default store;
