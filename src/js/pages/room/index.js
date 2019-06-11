import React, {useState, useEffect, Fragment} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter, Redirect} from 'react-router';
import classNames from 'classnames';

import {
  Actions as RoomActions,
  Selectors as RoomSelectors,
} from 'services/rooms';
import {
  Selectors as BuoySelectors,
  Actions as BuoyActions,
} from 'services/buoys';
import {LoadingState, ErrorState} from 'components/bigstates';
import {Actions} from './data';

const Stage = () => {
  return (
    <div className="room--stage">
      stage
    </div>
  );
};

const Peer = ({peer}) => {
  return (
    <div className="peer">
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
const MODE_PLAYLIST = 'playlist';

const Sidebar = () => {
  const [mode, setMode] = useState(MODE_PLAYLIST);

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
          className={classNames({selected: mode === MODE_PLAYLIST})}
          onClick={() => setMode(MODE_PLAYLIST)}
        >
          playlists
        </div>
      </div>
    </div>
  );
};

const RoomPage = ({match}) => {
  ////
  // Hooks
  //
  const isConnecting = useSelector(BuoySelectors.isConnecting);
  const connectedBuoy = useSelector(BuoySelectors.connectedBuoy);
  const dispatch = useDispatch()
  const room = useSelector(RoomSelectors.currentRoom);
  const [error, setError] = useState(null);

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
          <Stage />
          <Audience peers={room.get('peers')} />
        </div>
        <Sidebar />
      </div>
    </Fragment>
  );
};

export default withRouter(RoomPage);
