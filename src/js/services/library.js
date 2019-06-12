import Immutable from 'immutable';
import {takeEvery, call, put, select} from 'redux-saga/effects';
import JSMediaTags from 'jsmediatags';
import uuid from 'uuid/v1';

import db from 'db';
import {createAction} from 'utils/redux';

////
// Helpers
//
const readFile = ({file}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      resolve(reader.result);
    };

    reader.readAsArrayBuffer(file);
  });
};

const readTags = ({file}) => {
  return new Promise((resolve, reject) => {
    JSMediaTags.read(file, {onSuccess: resolve, onError: reject});
  });
};

////
// Actions
//
export const ActionTypes = {
  ADD_TRACK: 'services/library/add-track',
  ADD_TRACK_SUCCESS: 'services/library/add_track_success',
  ADD_TRACK_FAILURE: 'services/library/add_track_failure',

  SET_SELECTED_QUEUE: 'services/library/set_selected_queue',
  SET_TRACK: 'services/library/set_track',
  ADD_TO_QUEUE: 'services/library/add_to_queue',
};

export const Actions = {
  addTrack: createAction(ActionTypes.ADD_TRACK, 'file'),
  addTrackSuccess: createAction(ActionTypes.ADD_TRACK_SUCCESS, 'track'),
  addTrackFailure: createAction(ActionTypes.ADD_TRACK_FAILURE, 'message'),

  setSelectedQueue: createAction(ActionTypes.SET_SELECTED_QUEUE, 'queue'),
  setTrack: createAction(ActionTypes.SET_TRACK, 'track'),
  addToQueue: createAction(ActionTypes.ADD_TO_QUEUE, 'trackId', 'queueId')
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
    actionType: ActionTypes.SET_SELECTED_QUEUE,
    callback: (s, {queue}) => s.merge({selectedQueue: queue}),
  },
];

export const Reducers = {initialState, callbacks};

export const Selectors = {
  selectedQueue: s => s.getIn(['services', 'library', 'selectedQueue']),
  selectedQueueWithTracks: (s) => {
    const allTracks = s.getIn(['services', 'library', 'tracks']);
    const queue = s.getIn(['services', 'library', 'selectedQueue']);
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

  // Fetch and cache each track in the queue
  for (const trackId of queue.get('trackIds').toJS()) {
    const track = yield call(db.get, trackId);
    yield put(Actions.setTrack({track}));
  }
}

function* addTrack({file}) {
  const id3 = (yield call(readTags, {file})).tags;
  console.log(id3);
  const filename = file.name.split('.').slice(0, -1).join('.');
  const tags = {
    filename,
    artist: (id3.TPE1 ? id3.TPE1.data.trim() : null),
    album: (id3.TALB ? id3.TALB.data.trim() : null),
    track: (id3.TIT2 ? id3.TIT2.data.trim() : null),
  };

  // Pin the track onto IPFS
  let buffer;
  try {
    buffer = yield call(readFile, {file});
  } catch (e) {
    yield put(Actions.addTrackFailure({message: e.toString()}));
    return
  }

  let resp;
  try {
    resp = yield call(window.ipfs.add, Buffer.from(buffer), {pin: true});
  } catch (e) {
    yield put(Actions.addTrackFailure({message: e.toString()}));
    return;
  }

  const {hash} = resp[0];

  // Put the track into our db
  const track = Immutable.fromJS({
    ...tags,
    _id: `track/${uuid()}`,
    ipfsHash: hash,
    createdAt: Date.now(),
  });
  yield call(db.put, track);

  // Add the track to our currently selected queue
  const currentQueue = yield select(Selectors.selectedQueue);
  yield put(Actions.addToQueue({
    trackId: track.get('_id'),
    queueId: currentQueue.get('_id'),
  }));

  yield put(Actions.addTrackSuccess({track}));
}

function* addToQueue({trackId, queueId}) {
  const queue = yield call(db.get, queueId);
  const track = yield call(db.get, trackId);

  const updatedTrackIds = queue.get('trackIds').push(track.get('_id'));
  const updatedQueue = queue.merge({trackIds: updatedTrackIds});

  yield call(db.put, updatedQueue);
  yield put(Actions.setSelectedQueue({queue: updatedQueue}));
}

export function* Saga() {
  yield takeEvery('init', init);
  yield takeEvery(ActionTypes.ADD_TRACK, addTrack);
  yield takeEvery(ActionTypes.ADD_TO_QUEUE, addToQueue);
}
