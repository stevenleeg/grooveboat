import Immutable from 'immutable';
import {takeEvery, call, put, select} from 'redux-saga/effects';
import JSMediaTags from 'jsmediatags';
import uuid from 'uuid/v1';

import db from 'db';
import {createAction} from 'utils/redux';
import {rpcToAction} from './buoys';

const readTags = ({file}) => {
  return new Promise((resolve, reject) => {
    JSMediaTags.read(file, {onSuccess: resolve, onError: reject});
  });
};

const readFile = ({file}) => {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onloadend = e => resolve(e.target.result);
    fr.onerror = e => reject(e);
    fr.readAsArrayBuffer(file);
  });
};

const getBase64 = ({file}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      resolve(reader.result);
    });
    reader.addEventListener('error', (e) => {
      reject(e);
    });

    reader.readAsDataURL(file);
  });
}

////
// Actions
//
export const ActionTypes = {
  ADD_TRACK: 'services/library/add_track',
  ADD_TRACK_SUCCESS: 'services/library/add_track_success',
  ADD_TRACK_FAILURE: 'services/library/add_track_failure',

  DELETE_TRACK: 'services/library/delete_track',
  DELETE_TRACK_SUCCESS: 'services/library/delete_track_success',
  DELETE_TRACK_FAILURE: 'services/library/delete_track_failure',

  SET_SELECTED_QUEUE: 'services/library/set_selected_queue',
  SAVE_SELECTED_QUEUE: 'services/library/save_selected_queue',
  SAVE_SELECTED_QUEUE_SUCCESS: 'services/library/save_selected_queue_success',
  SAVE_SELECTED_QUEUE_FAILURE: 'services/library/save_selected_queue_failure',

  ADD_TO_QUEUE: 'services/library/add_to_queue',
  ADD_TO_QUEUE_SUCCESS: 'services/library/add_to_queue_success',
  ADD_TO_QUEUE_FAILURE: 'services/library/add_to_queue_failure',

  SET_TRACK: 'services/library/set_track',
  CYCLE_SELECTED_QUEUE: 'services/library/cycle_selected_queue',
  CYCLE_SELECTED_QUEUE_SUCCESS: 'services/library/cycle_selected_queue_success',
  CYCLE_SELECTED_QUEUE_FAILURE: 'services/library/cycle_selected_queue_failure',

  REQUEST_TRACK: 'services/library/request_track',
  REQUEST_TRACK_FAILURE: 'services/library/request_track_failure',
};

export const Actions = {
  addTrack: createAction(ActionTypes.ADD_TRACK, 'file'),
  addTrackSuccess: createAction(ActionTypes.ADD_TRACK_SUCCESS, 'track'),
  addTrackFailure: createAction(ActionTypes.ADD_TRACK_FAILURE, 'message'),

  deleteTrack: createAction(ActionTypes.DELETE_TRACK, 'track'),
  deleteTrackSuccess: createAction(ActionTypes.DELETE_TRACK_SUCCESS, 'trackId'),
  deleteTrackFailure: createAction(ActionTypes.DELETE_TRACK_FAILURE, 'message'),

  setSelectedQueue: createAction(ActionTypes.SET_SELECTED_QUEUE, 'queue'),
  saveSelectedQueue: createAction(ActionTypes.SAVE_SELECTED_QUEUE, 'queue'),
  saveSelectedQueueSuccess: createAction(ActionTypes.SAVE_SELECTED_QUEUE_SUCCESS, 'queue'),
  saveSelectedQueueFailure: createAction(ActionTypes.SAVE_SELECTED_QUEUE_FAILURE, 'queue'),

  setTrack: createAction(ActionTypes.SET_TRACK, 'track'),
  addToQueue: createAction(ActionTypes.ADD_TO_QUEUE, 'trackId', 'queueId'),
  addToQueueSuccess: createAction(ActionTypes.ADD_TO_QUEUE_SUCCESS, 'track', 'queue'),
  addToQueueFailure: createAction(ActionTypes.ADD_TO_QUEUE_FAILURE, 'message'),

  cycleSelectedQueue: createAction(ActionTypes.CYCLE_SELECTED_QUEUE),
  cycleSelectedQueueSuccess: createAction(ActionTypes.CYCLE_SELECTED_QUEUE_SUCCESS),
  cycleSelectedQueueFailure: createAction(ActionTypes.CYCLE_SELECTED_QUEUE_FAILURE),

  requestTrack: createAction(ActionTypes.REQUEST_TRACK, 'callback'),
  requestTrackFailure: createAction(ActionTypes.REQUEST_TRACK_FAILURE, 'message'),
};

////
// Reducers
//
const initialState = Immutable.fromJS({
  selectedQueue: null,
  tracks: {},
});

const callbacks = [
  {
    actionType: ActionTypes.SET_TRACK,
    callback: (s, {track}) => {
      return s.setIn(['tracks', track.get('_id')], track);
    },
  },
  {
    actionType: ActionTypes.ADD_TRACK_SUCCESS,
    callback: (s, {track}) => {
      return s.setIn(['tracks', track.get('_id')], track);
    },
  },
  {
    actionType: ActionTypes.DELETE_TRACK_SUCCESS,
    callback: (s, {trackId}) => {
      const trackIndex = s
        .getIn(['selectedQueue', 'trackIds'])
        .indexOf(trackId);

      let updatedQueue = s.get('selectedQueue');
      if (trackIndex !== -1) {
        updatedQueue = updatedQueue.deleteIn(['trackIds', trackIndex]);
      }

      return s
        .deleteIn(['tracks', trackId])
        .merge({selectedQueue: updatedQueue});
    },
  },
  {
    actionType: ActionTypes.SET_SELECTED_QUEUE,
    callback: (s, {queue}) => s.merge({selectedQueue: queue}),
  },
  {
    actionType: ActionTypes.ADD_TO_QUEUE_SUCCESS,
    callback: (s, {queue}) => {
      return s.merge({selectedQueue: queue});
    },
  },
  {
    actionType: ActionTypes.CYCLE_SELECTED_QUEUE,
    callback: (s, {queue}) => {
      const trackIds = s.getIn(['selectedQueue', 'trackIds']);
      const first = trackIds.first();
      const updated = trackIds.shift().push(first);
      return s.setIn(['selectedQueue', 'trackIds'], updated);
    },
  },
  {
    actionType: ActionTypes.CYCLE_SELECTED_QUEUE_SUCCESS,
    callback: (s, {queue}) => {
      return s.merge({selectedQueue: queue});
    },
  },
];

export const Reducers = {initialState, callbacks};

export const Selectors = {
  selectedQueue: s => s.getIn(['services', 'library', 'selectedQueue']),
  selectedQueueWithTracks: (s) => {
    const allTracks = s.getIn(['services', 'library', 'tracks']);
    const queue = s.getIn(['services', 'library', 'selectedQueue']);
    if (!queue) {
      return null;
    }

    const tracks = queue.get('trackIds')
      .map(trackId => allTracks.get(trackId))
      .filter(track => !!track);

    return queue.merge({tracks});
  },
};

////
// Sagas
//
function* init() {
  let queues;
  try {
    queues = yield call(db.get, 'queues');
  } catch (e) {
    if (e.status !== 404) {
      console.log('something went wront fetching the queue', e);
      return;
    }

    // Looks like they don't have a default queue, let's make one for them
    const defaultQueue = Immutable.fromJS({
      _id: `queues/${uuid()}`,
      name: 'default',
      trackIds: [],
    });

    queues = Immutable.fromJS({
      _id: 'queues',
      selectedId: defaultQueue.get('_id'),
      queueIds: [defaultQueue.get('_id')],
    });

    yield call(db.put, defaultQueue);
    yield call(db.put, queues);
  }

  // Fetch the selected queue
  const queue = yield call(db.get, queues.get('selectedId'));
  yield put(Actions.setSelectedQueue({queue}));

  // Fetch each track in the queue and begin seeding
  for (const trackId of queue.get('trackIds').toJS()) {
    const track = yield call(db.get, trackId);
    yield put(Actions.setTrack({track}));
  }
}

function* addTrack({file}) {
  let tags = {};
  const fallbackName = file.name.split('.').slice(0, -1).join('.');
  try {
    const id3 = (yield call(readTags, {file})).tags;
    tags = {
      filename: file.name,
      artist: (id3.TPE1 ? id3.TPE1.data.trim() : null),
      album: (id3.TALB ? id3.TALB.data.trim() : null),
      track: (id3.TIT2 ? id3.TIT2.data.trim() : fallbackName),
    };
  } catch (e) {
    console.log('could not read tags, falling back to filename'),
    tags = {
      filename: file.name,
      artist: null,
      album: null,
      track: fallbackName,
    };
  }

  // Put the track into our db
  let dataString;
  try {
    dataString = yield call(getBase64, {file});
  } catch (e) {
    yield put(Actions.addTrackFailure({message: e.toString()}));
    return;
  }

  const tmpTrack = Immutable.fromJS({
    ...tags,
    _id: `track/${uuid()}`,
    _attachments: {
      [file.name]: {
        content_type: file.type,
        data: dataString.split(',')[1],
      },
    },
    createdAt: Date.now(),
  });

  let resp
  try {
    resp = yield call(db.put, tmpTrack);
  } catch (e) {
    yield put(Actions.addTrackFailure({message: e.message}));
    return;
  }

  const track = tmpTrack.merge({
    _id: resp.id,
    _rev: resp.rev,
  });

  yield put(Actions.addTrackSuccess({track}));

  // Add the track to our currently selected queue
  const currentQueue = yield select(Selectors.selectedQueue);
  yield put(Actions.addToQueue({
    trackId: track.get('_id'),
    queueId: currentQueue.get('_id'),
  }));
}

function* addToQueue({trackId, queueId}) {
  const queue = yield call(db.get, queueId);
  const track = yield call(db.get, trackId);

  const updatedTrackIds = queue.get('trackIds').push(track.get('_id'));
  const updatedQueue = queue.merge({trackIds: updatedTrackIds});

  let resp;
  try {
    resp = yield call(db.put, updatedQueue);
  } catch (e) {
    yield put(Actions.addToQueueFailure({message: e.message}));
    return;
  }

  yield put(Actions.addToQueueSuccess({
    track,
    queue: updatedQueue.set('_rev', resp.rev),
  }));
}

function* requestTrack({callback}) {
  const currentQueue = yield select(Selectors.selectedQueueWithTracks);
  const track = currentQueue.getIn(['tracks', 0]);

  // Fetch the track data
  let blob;
  const attachmentName = track.get('_attachments').keySeq().first();
  try {
    blob = yield call(db.getAttachment, track.get('_id'), attachmentName);
  } catch (e) {
    yield put(Actions.requestTrackFailure({message: e.message}));
    return;
  }

  const contentType = track.getIn(['_attachments', attachmentName, 'content_type']);
  console.log(contentType);
  const respTrack = track
    .deleteAll(['_id', '_rev', '_attachments'])
    .merge({data: blob, contentType});

  callback({track: respTrack.toJS()});
  yield put(Actions.cycleSelectedQueue());
}

function* deleteTrack({track}) {
  // Remove the track from all queues
  const queues = yield call(db.get, 'queues');
  for (const queueId of queues.get('queueIds')) {
    const queue = yield call(db.get, queueId);
    const trackIndex = queue.get('trackIds').indexOf(track.get('_id'));
    if (trackIndex === -1) {
      continue;
    }

    let updatedQueue = queue.deleteIn(['trackIds', trackIndex]);
    let resp;
    try {
      resp = yield call(db.put, updatedQueue);
    } catch (e) {
      yield put(Actions.deleteTrackFailure({message: e.message}));
      return;
    }

    updatedQueue = updatedQueue.set('_rev', resp.rev);
  }

  // Remove the track from the database
  try {
    yield call(db.remove, track);
  } catch (e) {
    yield put(Actions.deleteTrackFailure({message: e.message}));
    return;
  }

  yield put(Actions.deleteTrackSuccess({trackId: track.get('_id')}));
}

function* cycleSelectedQueue() {
  const selectedQueue = yield select(Selectors.selectedQueue);

  let resp;
  try {
    resp = yield call(db.put, selectedQueue);
  } catch (e) {
    yield put(Actions.cycleSelectedQueueFailure({message: e.message}));
    return;
  }

  yield put(Actions.cycleSelectedQueueSuccess({
    queue: selectedQueue.set('_rev', resp.rev),
  }));
}

export function* Saga() {
  yield takeEvery('init', init);
  yield takeEvery(ActionTypes.ADD_TRACK, addTrack);
  yield takeEvery(ActionTypes.DELETE_TRACK, deleteTrack);
  yield takeEvery(ActionTypes.ADD_TO_QUEUE, addToQueue);
  yield takeEvery(ActionTypes.REQUEST_TRACK, requestTrack);
  yield takeEvery(ActionTypes.CYCLE_SELECTED_QUEUE, cycleSelectedQueue);

  yield* rpcToAction('requestTrack', Actions.requestTrack);
}
