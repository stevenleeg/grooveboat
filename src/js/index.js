import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import 'babel-polyfill';

import Router from './router';
import store from './store';
import Toaster from './components/toaster';

const electron = window.require('electron');
window.ipfs = electron.remote.getGlobal('ipfs');

const App = () => (
  <Provider store={store}>
    <Toaster />
    <Router />
  </Provider>
);

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('mount'));
});
