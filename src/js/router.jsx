import React from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';

import RoomSelectorPage from './pages/room-selector';
import RoomPage from './pages/room';

export default () => (
  <Router>
    <Switch>
      <Route exact path="/" component={RoomSelectorPage} />
      <Route exact path="/rooms/:roomId" component={RoomPage} />
    </Switch>
  </Router>
);
