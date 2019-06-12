import Immutable from 'immutable';

import {combineReducers, createReducer} from 'utils/redux';

import {Reducers as RoomService} from 'services/rooms';
import {Reducers as LibraryService} from 'services/library';
import {Reducers as BuoyService} from 'services/buoys';

export default combineReducers({
  services: combineReducers({
    buoys: createReducer(BuoyService),
    library: createReducer(LibraryService),
    rooms: createReducer(RoomService),
  }),
});
