import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import WebTorrent from 'webtorrent';
import 'babel-polyfill';

import Router from './router';
import store from './store';
import Toaster from './components/toaster';

window.webtorrent = new WebTorrent();

const App = () => (
  <Provider store={store}>
    <Toaster />
    <Router />
  </Provider>
);

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('mount'));
});
