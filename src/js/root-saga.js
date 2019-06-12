import {fork} from 'redux-saga/effects';

import {Saga as BuoyService} from 'services/buoys';
import {Saga as JukeboxService} from 'services/jukebox';
import {Saga as LibraryService} from 'services/library';
import {Saga as RoomService} from 'services/rooms';

import {Saga as RoomSelectorPage} from 'pages/room-selector/data';
import {Saga as RoomPage} from 'pages/room/data';

export default function*() {
  yield fork(BuoyService);
  yield fork(JukeboxService);
  yield fork(LibraryService);
  yield fork(RoomService);

  yield fork(RoomPage);
  yield fork(RoomSelectorPage);
}
