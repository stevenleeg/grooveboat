import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import 'babel-polyfill';

import Router from './router';
import store from './store';
import Toaster from './components/toaster';

const App = () => (
  <Provider store={store}>
    <Toaster />
    <Router />
  </Provider>
);

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('mount'));
});
