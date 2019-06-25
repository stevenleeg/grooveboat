import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import 'babel-polyfill';

import Router from './router';
import store from './store';
import Toaster from './components/toaster';
import {ApplicationError} from './components/bigstates';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  // eslint-disable-next-line class-methods-use-this
  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error, info) {
    console.log('caught an error'); //eslint-disable-line no-console
    console.log(error, info); //eslint-disable-line no-console
  }

  render() {
    const {hasError} = this.state;

    if (hasError) {
      return (
        <ApplicationError />
      );
    }

    return (
      <Provider store={store}>
        <Toaster />
        <Router />
      </Provider>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('mount'));
});
