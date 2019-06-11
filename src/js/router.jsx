import React from 'react';
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";

import RoomSelectorPage from './pages/room-selector';

export default () => (
  <Router>
    <Switch>
      <Route exact path="/" component={RoomSelectorPage} />
    </Switch>
  </Router>
);
