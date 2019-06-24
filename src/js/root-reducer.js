import {combineReducers, createReducer} from './utils/redux';

import {Reducers as BuoyService} from './services/buoys';
import {Reducers as LibraryService} from './services/library';
import {Reducers as JukeboxService} from './services/jukebox';
import {Reducers as RoomService} from './services/rooms';
import {Reducers as ToasterService} from './services/toaster';

export default combineReducers({
  services: combineReducers({
    buoys: createReducer(BuoyService),
    jukebox: createReducer(JukeboxService),
    library: createReducer(LibraryService),
    rooms: createReducer(RoomService),
    toaster: createReducer(ToasterService),
  }),
});
