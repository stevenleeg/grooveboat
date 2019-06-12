import React, {useState, useEffect, Fragment} from 'react';
import Immutable from 'immutable';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter, Redirect} from 'react-router';
import classNames from 'classnames';
import {useDropzone} from 'react-dropzone';

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
import {LoadingState, ErrorState} from 'components/bigstates';
import {Actions} from './data';

const Stage = ({djs, currentTrack}) => {
  ////
  // Hooks
  //
  const dispatch = useDispatch()

  ////
  // Render
  //
  return (
    <div className="room--stage">
      <div className="stage--nowplaying">
        <div className="up">👍</div>
        <div className="song">
          LCD Soundsystem - Daft Punk is Playing At My House
        </div>
        <div className="down">👎</div>
      </div>
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

          return (
            <Peer
              key={peer.get('id')}
              peer={peer}
              className={classNames({active: false})}
            >
              <div className="popularity-bar">
                <div className="ups" />
                <div className="downs" />
              </div>
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
        {queue.get('tracks').map((track) => {
          return (
            <li key={track.get('_id')}>
              {track.get('filename')}
            </li>
          );
        })}
      </ul>

      <div className="queues--dropzone" {...getRootProps()}>
        <input {...getInputProps()} />
        share 'em
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
          queues
        </div>
      </div>
      {mode === MODE_QUEUE && (
        <Queues />
      )}
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

  const room = useSelector(RoomSelectors.currentRoom);
  const djs = useSelector(RoomSelectors.djs);
  const audience = useSelector(RoomSelectors.audience);

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
    <Fragment>
      <div className="header">
        <div className="logo">🕺🚢</div>
      </div>
      <div className="room--container">
        <div className="room--content">
          <Stage djs={djs} />
          <Audience peers={audience} />
        </div>
        <Sidebar />
      </div>
    </Fragment>
  );
};

export default withRouter(RoomPage);
