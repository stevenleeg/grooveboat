import React, {useState, useEffect, useRef, Fragment} from 'react';
import {CSSTransitionGroup} from 'react-transition-group';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import Immutable from 'immutable';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter} from 'react-router';
import classNames from 'classnames';
import {useDropzone} from 'react-dropzone';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Picker} from 'emoji-mart';
import * as Icon from '@fortawesome/free-solid-svg-icons';

import {
  Actions as RoomActions,
  Selectors as RoomSelectors,
} from '../../services/rooms';
import {
  Selectors as BuoySelectors,
} from '../../services/buoys';
import {
  Actions as LibraryActions,
  Selectors as LibrarySelectors,
} from '../../services/library';
import {
  Selectors as JukeboxSelectors,
  Actions as JukeboxActions,
} from '../../services/jukebox';
import {
  Actions as ToasterActions,
} from '../../services/toaster';
import {LoadingState, ErrorState} from '../../components/bigstates';
import {Actions} from './data';
import {useInterval} from '../../utils/react';
import {lpad} from '../../utils/strings';

import BoatImageURL from '../../../assets/img/boat.png';
import ChatImageURL from '../../../assets/img/chat.png';

const NowPlaying = () => {
  ////
  // Hooks
  //
  const currentTrack = useSelector(JukeboxSelectors.currentTrack);
  const loadingTrack = useSelector(JukeboxSelectors.loadingTrack);
  const dispatch = useDispatch();
  const currentPeerId = useSelector(BuoySelectors.peerId);
  const room = useSelector(RoomSelectors.currentRoom);
  const activeDjId = room.get('activeDj');
  const [seek, setSeek] = useState(0);

  useInterval(() => {
    if (window.player) {
      setSeek(window.player.seek());
    }
  }, 1000);

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

  const currentPeerVote = currentTrack ? currentTrack.getIn(['votes', currentPeerId]) : null;
  const isVotingDisabled = !currentTrack || activeDjId === currentPeerId;

  let durationMinutes = 0;
  let durationSeconds = 0;
  let seekMinutes = 0;
  let seekSeconds = 0;
  let progressPerc = 0;
  if (currentTrack) {
    durationMinutes = lpad(Math.floor(currentTrack.get('duration') / 60), '0', 2);
    durationSeconds = lpad(Math.floor(currentTrack.get('duration')) - (durationMinutes * 60), '0', 2);
    seekMinutes = lpad(Math.floor(seek / 60), '0', 2);
    seekSeconds = lpad(Math.floor(seek) - (seekMinutes * 60), '0', 2);

    progressPerc = Math.floor(seek / currentTrack.get('duration') * 100);
  }

  return (
    <div className="nowplaying">
      <div className="nowplaying--content">
        <VoteButton
          direction="up"
          isDisabled={isVotingDisabled}
          isToggled={currentPeerVote === true}
          onClick={() => vote(true)}
        />
        <div className="song">{song}</div>
        <VoteButton
          direction="down"
          isDisabled={isVotingDisabled}
          isToggled={currentPeerVote === false}
          onClick={() => vote(false)}
        />
      </div>
      <div className="nowplaying--bar">
        {(currentTrack && loadingTrack) && (
          <Fragment>
            <div className="loading-track" />
            <div className="bar-text">loading...</div>
          </Fragment>
        )}
        {(currentTrack && !loadingTrack) && (
          <Fragment>
            <div className="progress" style={{width: `${progressPerc}%`}} />
            <div className="bar-text">
              {`${seekMinutes}:${seekSeconds} / ${durationMinutes}:${durationSeconds}`}
            </div>
          </Fragment>
        )}
      </div>
    </div>
  );
};

const VoteButton = ({direction, isDisabled, isToggled, onClick}) => {
  const voteEmoji = direction === 'up' ? '👍' : '👎';

  return (
    <div
      className={classNames([direction, {disabled: isDisabled}, {toggled: isToggled}])}
      onClick={isDisabled ? null : onClick}
    >
      {voteEmoji}
    </div>
  );
};

const Stage = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const room = useSelector(RoomSelectors.currentRoom);
  const djs = useSelector(RoomSelectors.djs);
  const currentTrack = useSelector(JukeboxSelectors.currentTrack);
  const currentPeerId = useSelector(BuoySelectors.peerId);
  const {upCount, downCount} = useSelector(JukeboxSelectors.voteCounts);

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
          } if (!djs.get(i)) {
            return (
              <div key={i} className="empty-slot" />
            );
          }

          return (
            <Peer
              key={peer.get('id')}
              peer={peer}
              me={peer.get('id') === currentPeerId}
              className={classNames({
                active: peer.get('id') === activeDjId,
                dancing: currentTrack && currentTrack.getIn(['votes', peer.get('id')]),
              })}
            >
              {peer.get('id') === activeDjId && (
                <div className="popularity-bar">
                  <div className="ups" style={{flex: upCount}} />
                  <div className="downs" style={{flex: downCount}} />
                </div>
              )}
            </Peer>
          );
        })}
      </div>
    </div>
  );
};

const Peer = ({peer, className, children, me}) => {
  return (
    <div className={classNames(['peer', className])}>
      {me && <div className="me-badge" />}
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
  const currentPeerId = useSelector(BuoySelectors.peerId);

  ////
  // Render
  //
  return (
    <div className="room--audience">
      {audience.map((peer) => {
        return <Peer
          key={peer.get('id')}
          me={peer.get('id') === currentPeerId}
          peer={peer}
          className={classNames({
            dancing: currentTrack && currentTrack.getIn(['votes', peer.get('id')]),
          })}
        />;
      })}
    </div>
  );
};

const Track = SortableElement(({track, onDelete, onBump, index}) => {
  let top = track.get('filename');
  if (track.get('track')) {
    top = track.get('track');
  }

  let bottom = 'Untitled';
  if (track.get('artist')) {
    bottom = track.get('artist');
  }

  return (
    <li className="queues--tracks-track">
      <div className="top">{top}</div>
      {!!bottom && <div className="bottom">{bottom}</div>}
      <div className="actions">
        {index !== 0 && <a onClick={onBump}><FontAwesomeIcon icon={Icon.faAngleUp} /></a>}
        <a onClick={onDelete}><FontAwesomeIcon icon={Icon.faTimes} /></a>
      </div>
    </li>
  );
});

const TrackList = SortableContainer(({tracks, onDelete, onBump}) => {
  return (
    <ul className="queues--tracks">
      {tracks.map((track, i) => {
        return (
          <Track
            key={track.get('_id')}
            onDelete={() => onDelete({track})}
            onBump={() => onBump({track})}
            track={track}
            index={i}
            helperClass="active"
          />
        );
      })}
    </ul>
  );
});

const Queues = () => {
  ////
  // Hooks
  //
  const dispatch = useDispatch();
  const queue = useSelector(LibrarySelectors.selectedQueueWithTracks);
  const room = useSelector(RoomSelectors.currentRoom);
  const peerId = useSelector(BuoySelectors.peerId);
  const isAddingTrack = useSelector(LibrarySelectors.addingTrack);
  const isDj = room.get('djs').indexOf(peerId) !== -1;

  ////
  // Action callbacks
  //
  const onDrop = (files) => {
    // Don't process two tracks at once
    if (isAddingTrack) return;

    files.forEach((file) => {
      dispatch(LibraryActions.addTrack({file}));
    });
  };

  const sortEnd = ({oldIndex, newIndex}) => {
    const fromTrackId = queue.getIn(['tracks', oldIndex, '_id']);
    const toTrackId = queue.getIn(['tracks', newIndex, '_id']);

    dispatch(LibraryActions.swapTrackOrder({fromTrackId, toTrackId}));
  };

  const onBump = ({track}) => {
    // Bump the track to the top of the queue
    const toTrackId = queue.getIn(['tracks', 0, '_id']);
    dispatch(LibraryActions.swapTrackOrder({fromTrackId: track.get('_id'), toTrackId}));
  };

  const onDelete = ({track}) => {
    // Don't let users delete their only track if they're an active DJ
    if (isDj && queue.get('tracks').count() === 1) {
      dispatch(ToasterActions.notify({
        title: 'no can do',
        message: 'you can\'t delete your only track while you\'re a dj',
        icon: '🤔',
      }));
      return;
    }

    dispatch(LibraryActions.deleteTrack({track}));
  };

  ////
  // Render
  //
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  let dropText = 'drop a song';
  if (isAddingTrack) {
    dropText = 'reticulating splines...';
  } else if (isDragActive) {
    dropText = 'that\'s it, drop it!';
  }

  return (
    <div className="sidebar--queues">
      <select>
        <option>default</option>
        <option>+ new queue</option>
      </select>
      {queue.get('tracks').count() > 0 && (
        <TrackList
          onSortEnd={sortEnd}
          distance={3}
          tracks={queue.get('tracks')}
          onDelete={onDelete}
          onBump={onBump}
        />
      )}
      {queue.get('tracks').count() === 0 && (
        <div className="queues--no-tracks"><p>nothing yet</p></div>
      )}
      <div
        {...getRootProps()}
        className={classNames({
          'queues--dropzone': true,
          active: isDragActive,
          disabled: isAddingTrack,
        })}
      >
        <input {...getInputProps()} />
        <Fragment>{dropText}</Fragment>
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
  const sendingMessage = useSelector(RoomSelectors.sendingMessage);
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
    if (sendingMessage) return;

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
              <div className="sender-name">
                {emoji}
                {' '}
                {handle}
              </div>
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

const setFavicon = (img) => {
  const fav = document.getElementById('favicon');
  fav.href = img;
};

const Sidebar = () => {
  ////
  // Hooks
  //
  const [mode, setMode] = useState(MODE_CHAT);
  const [seenMessages, setSeenMessages] = useState(new Immutable.Set());

  const chatMessages = useSelector(RoomSelectors.chatMessages);

  useEffect(() => {
    // If we're in chat mode, mark all of the chat messages as read
    if (mode === MODE_CHAT) {
      const seen = chatMessages.reduce((set, msg) => {
        return set.add(msg.get('id'));
      }, new Immutable.Set());

      setSeenMessages(seen);
      setFavicon(BoatImageURL);
    }

    // If we're in queue mode, set the favicon to the chat icon if there are
    // unread messages
    if (mode === MODE_QUEUE) {
      const chatMessageIds = chatMessages.reduce((set, msg) => set.add(msg.get('id')), new Immutable.Set());
      const numUnread = chatMessageIds.subtract(seenMessages).count();
      if (numUnread > 0) {
        setFavicon(ChatImageURL);
      }
    }
  }, [chatMessages, mode]);

  // Subtract the set of current message ids from the set of read message ids
  // to get our unread count
  const chatMessageIds = chatMessages.reduce((set, msg) => set.add(msg.get('id')), new Immutable.Set());
  const numUnread = chatMessageIds.subtract(seenMessages).count();

  let chatIndicator = '';
  if (mode === MODE_QUEUE && numUnread > 0) {
    chatIndicator = ` (${numUnread})`;
  }

  ////
  // Rendering
  //
  return (
    <div className="room--sidebar">
      <div className="sidebar--tabs">
        <div
          className={classNames({selected: mode === MODE_CHAT})}
          onClick={() => setMode(MODE_CHAT)}
        >
          chat
          {chatIndicator}
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

const SkipWarning = () => {
  ////
  // Hooks
  //
  const room = useSelector(RoomSelectors.currentRoom);

  if (!room.get('skipWarning')) {
    return false;
  }

  ////
  // Render
  //
  return (
    <div className="room--skip-warning">
      the audience doesn't seem to be liking this track. it'll be skipped
      shortly unless they change their minds.
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
        type="button"
        className="plain"
        onClick={() => dispatch(RoomActions.stepDown())}
      >
        step down
      </button>
      {activeDjId === peerId && (
        <button
          type="button"
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
      <button type="button" onClick={save}>save</button>

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
const Settings = withRouter(({open, onClose, history}) => {
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
            <li onClick={() => history.push('/')}>leave room</li>
          </ul>
        </div>
      )}
      {screen === SETTINGS_SCREEN_EDIT_PROFILE && (
        <EditProfileSettings
          onClose={() => onClose()}
        />
      )}
    </div>
  );
});

const RoomPage = ({history, match}) => {
  ////
  // Hooks
  //
  const isConnecting = useSelector(BuoySelectors.isConnecting);
  const connectedBuoy = useSelector(BuoySelectors.connectedBuoy);
  const isFetchingBuoys = useSelector(BuoySelectors.isFetching);
  const buoys = useSelector(BuoySelectors.buoys);
  const muted = useSelector(JukeboxSelectors.mute);

  const dispatch = useDispatch();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState(null);

  const room = useSelector(RoomSelectors.currentRoom);

  useEffect(() => {
    dispatch(Actions.init({
      roomId: match.params.roomId,
      failureCallback: ({message}) => {
        setError(message);
      },
    }));

    return () => {
      // Leave the room when the component unmounts
      if (connectedBuoy) {
        dispatch(RoomActions.leaveRoom());
      }
    };
  }, []);

  useEffect(() => {
    // Redirect to index if we didn't find any buoys
    if (isFetchingBuoys === false && buoys.count() === 0) {
      history.push('/');
    }
  }, [isFetchingBuoys]);

  ////
  // Rendering
  //
  if (error) {
    return <ErrorState message={error} />;
  } if (isConnecting || !connectedBuoy || !room) {
    return <LoadingState title="connecting" subtitle="give it a sec" />;
  }

  return (
    <Fragment>
      <div className="room--container">
        <NowPlaying />
        <div className="room--content">
          <div className="room--main">
            <SkipWarning />
            <DJBar />
            <Stage />
            <Audience />
          </div>
          <Sidebar />
        </div>
      </div>
      <div
        className="room--bubble room--mute-bubble"
        onClick={() => dispatch(JukeboxActions.setMute({value: !muted}))}
      >
        <FontAwesomeIcon icon={muted ? Icon.faVolumeOff : Icon.faVolumeUp} />
      </div>
      <div
        className={classNames(['room--bubble', 'room--settings-bubble', {open: settingsOpen}])}
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        <FontAwesomeIcon icon={settingsOpen ? Icon.faTimes : Icon.faCog} />
      </div>
      <CSSTransitionGroup
        transitionName="room-settings--trans"
        transitionEnterTimeout={250}
        transitionLeaveTimeout={250}
      >
        {settingsOpen && (
          <Settings key="settings" onClose={() => setSettingsOpen(false)} />
        )}
      </CSSTransitionGroup>
    </Fragment>
  );
};

export default withRouter(RoomPage);
