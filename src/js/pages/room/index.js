import React, {useState, useEffect, Fragment} from 'react';
import Immutable from 'immutable';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter, Redirect} from 'react-router';
import classNames from 'classnames';
import {useDropzone} from 'react-dropzone';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import * as Icon from '@fortawesome/free-solid-svg-icons'

import {
  Actions as RoomActions,
  Selectors as RoomSelectors,
} from 'services/rooms';
import {
  Selectors as BuoySelectors,
  Actions as BuoyActions,
} from 'services/buoys';
import {
  Actions as LibraryActions,
  Selectors as LibrarySelectors,
} from 'services/library';
import {
  Selectors as JukeboxSelectors,
} from 'services/jukebox';
import {LoadingState, ErrorState} from 'components/bigstates';
import {Actions} from './data';

const NowPlaying = () => {
  ////
  // Hooks
  //
  const currentTrack = useSelector(JukeboxSelectors.currentTrack);

  ////
  // Rendering
  //
  let song = 'Awaiting track...';
  if (currentTrack && currentTrack.get('artist') && currentTrack.get('track')) {
    song = `${currentTrack.get('artist')} - ${currentTrack.get('track')}`;
  } else if (currentTrack && currentTrack.get('filename')) {
    song = currentTrack.get('filename');
  }

  return (
    <div className="nowplaying">
      <div className="nowplaying--dragbar" />
      <div className="nowplaying--content">
        <div className="up">👍</div>
        <div className="song">{song}</div>
        <div className="down">👎</div>
      </div>
    </div>
  );
};

const Stage = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch()
  const room = useSelector(RoomSelectors.currentRoom);
  const djs = useSelector(RoomSelectors.djs);

  ////
  // Render
  //
  const activeDjId = room.get('activeDj');

  return (
    <div className="room--stage">
      <div className="stage--djs">
        {Immutable.Range(0, 5).map((_, i) => {
          const peer = djs.get(i);
          if (i === djs.count()) {
            return (
              <div
                key={i} 
                className="empty-slot clickable"
                onClick={() => dispatch(RoomActions.becomeDj())}
              >
                +
              </div>
            );
          } else if (!djs.get(i)) {
            return (
              <div key={i} className="empty-slot" />
            );
          }

          // TODO: Add the popularity bar back in:
          //<div className="popularity-bar">
          //  <div className="ups" />
          //  <div className="downs" />
          //</div>
          return (
            <Peer
              key={peer.get('id')}
              peer={peer}
              className={classNames({active: peer.get('id') === activeDjId})}
            >
            </Peer>
          );
        })}
      </div>
    </div>
  );
};

const Peer = ({peer, className, children}) => {
  return (
    <div className={classNames(['peer', className])}>
      {children}
      <div className="icon">😀</div>
      <div className="name">{peer.get('id')}</div>
    </div>
  );
};

const Audience = ({peers}) => {
  return (
    <div className="room--audience">
      {peers.map((peer) => {
        return <Peer key={peer.get('id')} peer={peer} />;
      })}
    </div>
  );
};

const MODE_CHAT = 'chat';
const MODE_QUEUE = 'queue';

const Queues = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const queue = useSelector(LibrarySelectors.selectedQueueWithTracks);

  ////
  // Action callbacks
  //
  const onDrop = (files) => {
    files.forEach((file) => {
      dispatch(LibraryActions.addTrack({file}));
    });
  };

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  return (
    <div className="sidebar--queues">
      <select>
        <option>default</option>
        <option>+ new queue</option>
      </select>

      <ul className="queues--tracks">
        {queue && queue.get('tracks').map((track) => {
          let top = track.get('filename');
          if (track.get('track')) {
            top = track.get('track');
          }

          let bottom = '';
          if (track.get('artist')) {
            bottom = track.get('artist');
          }

          return (
            <li key={track.get('_id')}>
              <div className="top">{top}</div>
              {!!bottom && <div className="bottom">{bottom}</div>}
              <div className="actions">
                <a onClick={() => dispatch(LibraryActions.deleteTrack({track}))}>
                  <FontAwesomeIcon icon={Icon.faAngleUp} />
                </a>
                <a onClick={() => dispatch(LibraryActions.deleteTrack({track}))}>
                  <FontAwesomeIcon icon={Icon.faAngleDown} />
                </a>
                <a onClick={() => dispatch(LibraryActions.deleteTrack({track}))}>
                  <FontAwesomeIcon icon={Icon.faTimes} />
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        {...getRootProps()}
        className={classNames({
          'queues--dropzone': true,
          'active': isDragActive,
        })}
      >
        <input {...getInputProps()} />
        {isDragActive ? <Fragment>that's it, drop it!</Fragment> : <Fragment>drop a song</Fragment>}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [mode, setMode] = useState(MODE_QUEUE);

  return (
    <div className="room--sidebar">
      <div className="sidebar--tabs">
        <div
          className={classNames({selected: mode === MODE_CHAT})}
          onClick={() => setMode(MODE_CHAT)}
        >
          chat
        </div>
        <div
          className={classNames({selected: mode === MODE_QUEUE})}
          onClick={() => setMode(MODE_QUEUE)}
        >
          queue
        </div>
      </div>
      {mode === MODE_QUEUE && (
        <Queues />
      )}
    </div>
  );
};

const DJBar = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const room = useSelector(RoomSelectors.currentRoom);
  const activeDjId = room.get('activeDj');
  const peerId = useSelector(BuoySelectors.peerId);

  ////
  // Rendering
  //
  if (!activeDjId || activeDjId !== peerId) {
    return false;
  }

  return (
    <div className="dj-bar">
      <button
        className="plain"
        onClick={() => dispatch(RoomActions.stepDown())}
      >
        step down
      </button>
      <button
        className="plain"
      >
        skip track
      </button>
    </div>
  );
};

const RoomPage = ({match}) => {
  ////
  // Hooks
  //
  const isConnecting = useSelector(BuoySelectors.isConnecting);
  const connectedBuoy = useSelector(BuoySelectors.connectedBuoy);
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const audience = useSelector(RoomSelectors.audience);
  const room = useSelector(RoomSelectors.currentRoom);

  useEffect(() => {
    dispatch(Actions.init({
      roomId: match.params.roomId,
      failureCallback: ({message}) => {
        console.log(message);
        setError(message);
      },
    }));
  }, []);

  ////
  // Rendering
  //
  if (error) {
    return <ErrorState message={error} />
  } else if (isConnecting || !connectedBuoy || !room) {
    return <LoadingState title="connecting" subtitle="give it a sec" />;
  }

  return (
    <div className="room--container">
      <NowPlaying />
      <div className="room--content">
        <div className="room--main">
          <DJBar />
          <Stage />
          <Audience peers={audience} />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};

export default withRouter(RoomPage);
