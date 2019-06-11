import Immutable from 'immutable';

import {combineReducers, createReducer} from 'utils/redux';
import {Reducers as RoomService} from 'services/rooms';
import {Reducers as BuoyService} from 'services/buoys';

export default combineReducers({
  services: combineReducers({
    rooms: createReducer(RoomService),
    buoys: createReducer(BuoyService),
  }),
});
