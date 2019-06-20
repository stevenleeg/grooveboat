import React, {useState, useEffect, useRef, Fragment} from 'react';
import Immutable from 'immutable';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter, Redirect} from 'react-router';
import classNames from 'classnames';
import {useDropzone} from 'react-dropzone';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Picker} from 'emoji-mart';
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
  const dispatch = useDispatch();

  ////
  // Action callbacks
  //
  const vote = (direction) => {
    dispatch(RoomActions.vote({direction}));
  };

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
      <div className="nowplaying--content">
        <div
          className={classNames(['up', {disabled: !currentTrack}])}
          onClick={() => vote(true)}
        >
          👍
        </div>
        <div className="song">{song}</div>
        <div
          className={classNames(['down', {disabled: !currentTrack}])}
          onClick={() => vote(false)}
        >
          👎
        </div>
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
  const currentTrack = useSelector(JukeboxSelectors.currentTrack);

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
              className={classNames({
                active: peer.get('id') === activeDjId,
                dancing: currentTrack && currentTrack.getIn(['votes', peer.get('id')]),
              })}
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
      <div className="icon">{peer.getIn(['profile', 'emoji']) || '❓'}</div>
      <div className="name">{peer.getIn(['profile', 'handle']) || peer.get('id')}</div>
    </div>
  );
};

const Audience = () => {
  ////
  // Hooks
  //
  const audience = useSelector(RoomSelectors.audience);
  const currentTrack = useSelector(JukeboxSelectors.currentTrack);

  ////
  // Render
  //
  return (
    <div className="room--audience">
      {audience.map((peer) => {
        return <Peer
          key={peer.get('id')}
          peer={peer}
          className={classNames({
            dancing: currentTrack && currentTrack.getIn(['votes', peer.get('id')]),
          })}
        />;
      })}
    </div>
  );
};

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
        {queue && queue.get('tracks').map((track, i) => {
          let top = track.get('filename');
          if (track.get('track')) {
            top = track.get('track');
          }

          let bottom = '';
          if (track.get('artist')) {
            bottom = track.get('artist');
          }

          const nextTrack = queue.getIn(['tracks', i + 1]);
          const prevTrack = i == 0 ? null : queue.getIn(['tracks', i - 1]);

          return (
            <li key={track.get('_id')}>
              <div className="top">{top}</div>
              {!!bottom && <div className="bottom">{bottom}</div>}
              <div className="actions">
                {prevTrack && (
                  <a
                    onClick={() => dispatch(LibraryActions.swapTrackOrder({
                      fromTrackId: track.get('_id'),
                      toTrackId: prevTrack.get('_id'),
                    }))}
                  >
                    <FontAwesomeIcon icon={Icon.faAngleUp} />
                  </a>
                )}
                {nextTrack && (
                  <a
                    onClick={() => dispatch(LibraryActions.swapTrackOrder({
                      fromTrackId: track.get('_id'),
                      toTrackId: nextTrack.get('_id'),
                    }))}
                  >
                    <FontAwesomeIcon icon={Icon.faAngleDown} />
                  </a>
                )}
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

const Chat = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const newMessage = useSelector(RoomSelectors.newMessage);
  const messages = useSelector(RoomSelectors.chatMessagesWithPeers);
  const msgsContainerEl = useRef(null);

  useEffect(() => {
    const el = msgsContainerEl.current;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  ////
  // Action callbacks
  //
  const onChange = (e) => {
    if (e.key === 'Enter') {
      return;
    }

    dispatch(RoomActions.setNewChatMessage({message: e.target.value}));
  };

  const onKeyPress = (e) => {
    if (e.key === 'Enter') {
      dispatch(RoomActions.sendChat());
      e.preventDefault();
    }
  };

  ////
  // Render
  //
  return (
    <div className="sidebar--chat">
      <div className="chat--msgs" ref={msgsContainerEl}>
        {messages.map((msg) => {
          const peer = msg.get('peer');
          const handle = peer.getIn(['profile', 'handle']) || peer.get('id');
          const emoji = peer.getIn(['profile', 'emoji']) || '❓';

          return (
            <div className="chat--msg" key={msg.get('id')}>
              <div className="sender-name">{emoji} {handle}</div>
              <div className="message">{msg.get('message')}</div>
            </div>
          );
        })}
        {messages.count() === 0 && (
          <div className="chat--no-msgs"><p>nothing yet</p></div>
        )}
      </div>

      <div className="chat--compose">
        <textarea
          placeholder="type it and hit enter"
          onChange={onChange}
          value={newMessage}
          onKeyPress={onKeyPress}
        />
      </div>
    </div>
  );
};

const MODE_CHAT = 'chat';
const MODE_QUEUE = 'queue';

const Sidebar = () => {
  const [mode, setMode] = useState(MODE_CHAT);

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
      {mode === MODE_CHAT && (
        <Chat />
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
  const isDj = room.get('djs').indexOf(peerId) !== -1;

  if (!isDj) {
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
      {activeDjId === peerId && (
        <button
          className="plain"
          onClick={() => dispatch(RoomActions.skipTurn())}
        >
          skip turn
        </button>
      )}
    </div>
  );
};

const EditProfileSettings = ({onClose}) => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const peer = useSelector(RoomSelectors.currentPeer);
  const [showEmojiMart, setShowEmojiMart] = useState(false);
  const [form, setForm] = useState({
    handle: peer.getIn(['profile', 'handle']) || '',
    emoji: peer.getIn(['profile', 'emoji']) || '❓',
  });

  ////
  // Action callbacks
  //
  const save = () => {
    dispatch(RoomActions.setProfile({profile: Immutable.fromJS(form)}));
    onClose();
  };

  ////
  // Render
  //
  return (
    <div className="settings--edit-profile">
      <h1>edit profile</h1>
      <label>avatar</label>
      <div className="emoji">
        <div className="frame" onClick={() => setShowEmojiMart(!showEmojiMart)}>
          {form.emoji}
        </div>
      </div>
      <label>username</label>
      <input
        type="text"
        placeholder="l33t_user42"
        value={form.handle}
        onChange={e => setForm({...form, handle: e.target.value})}
      />
      <button onClick={save}>save</button>

      <div
        className={classNames(['emoji-popover', {open: showEmojiMart}])}
      >
        <Picker
          set="apple"
          onSelect={(emoji) => {
            setForm({...form, emoji: emoji.native});
            setShowEmojiMart(false);
          }}
        />
      </div>
    </div>
  );
};

const SETTINGS_SCREEN_MENU = 'menu';
const SETTINGS_SCREEN_EDIT_PROFILE = 'edit-profile';
const Settings = ({open}) => {
  ////
  // Hooks
  //
  const [screen, setScreen] = useState(SETTINGS_SCREEN_MENU);

  ////
  // Rendering
  //
  return (
    <div
      className={classNames(['room--settings', {open}])}
    >
      {screen === SETTINGS_SCREEN_MENU && (
        <div className="settings--menu">
          <ul>
            <li onClick={() => setScreen(SETTINGS_SCREEN_EDIT_PROFILE)}>edit profile</li>
            <li onClick={() => window.open('https://github.com/stevenleeg/grooveboat/issues', '_blank')}>
              report a bug
            </li>
          </ul>
        </div>
      )}
      {screen === SETTINGS_SCREEN_EDIT_PROFILE && (
        <EditProfileSettings
          onClose={() => setScreen(SETTINGS_SCREEN_MENU)}
        />
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState(null);

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
    <Fragment>
      <div className="room--container">
        <NowPlaying />
        <div className="room--content">
          <div className="room--main">
            <DJBar />
            <Stage />
            <Audience />
          </div>
          <Sidebar />
        </div>
      </div>
      <div
        className={classNames(['room--settings-bubble', {open: settingsOpen}])}
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        <FontAwesomeIcon icon={settingsOpen ? Icon.faTimes : Icon.faCog} />
      </div>
      <Settings open={settingsOpen} />
    </Fragment>
  );
};

export default withRouter(RoomPage);
