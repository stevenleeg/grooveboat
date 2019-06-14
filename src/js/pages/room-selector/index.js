import React, {Fragment, useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter} from 'react-router';
import JWT from 'jsonwebtoken';
import classNames from 'classnames';

import {
  Selectors as RoomSelectors,
  Actions as RoomActions,
} from 'services/rooms';
import {
  Selectors as BuoySelectors,
  Actions as BuoyActions,
} from 'services/buoys';
import {Actions} from './data';
import layout from 'components/layout';

const EXAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzIjoid3M6Ly9idW95LnRlaWYueHl6LyJ9.Av1Z3HtkzLTMwjyJ_3rs4ARvqpdK8ylHllBrBwF-Vvg';

const SCREEN_INVITE = 'invite';
const SCREEN_CREATE_ROOM = 'create-room';
const SCREEN_DEFAULT = 'default';

const RoomSelectorPage = ({history}) => {
  ////
  // Hooks
  //
  const [screen, setScreen] = useState(SCREEN_DEFAULT);
  const [inviteForm, setInviteForm] = useState({
    invite: '',
    roomName: '',
  });
  const [createForm, setCreateForm] = useState({
    name: '',
  });

  const rooms = useSelector(RoomSelectors.rooms);
  const buoys = useSelector(BuoySelectors.buoys);
  const isConnecting = useSelector(BuoySelectors.isConnecting);
  const connectedBuoy = useSelector(BuoySelectors.connectedBuoy);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(Actions.init());
  }, []);

  useEffect(() => {
    let token = null;
    if (inviteForm.invite.length > 0) {
      const str = inviteForm.invite
        .replace(' ', '')
        .replace("\n", '');
      try {
        token = JWT.decode(str)
      } catch (e) {
        token = null;
        return;
      }

      if (token && token.u) {
        dispatch(Actions.joinBuoy({
          inviteCode: str,
          callback: () => setScreen(SCREEN_DEFAULT),
        }));
      }
    }
  }, [inviteForm]);

  ////
  // Action callbacks
  //
  const onCreateSuccess = ({room}) => {
    history.push(`/rooms/${room.get('id')}`);
  };

  ////
  // Rendering
  //
  let content;
  if (isConnecting) {
    content = (
      <Fragment>
        <h1>welcome</h1>
        <p>connecting...</p>
      </Fragment>
    );
  } else if (screen === SCREEN_INVITE) {
    content = (
      <Fragment>
        <h1>join a buoy</h1>
        <label htmlFor="server_code">invite code</label>
        <textarea
          className="room-selector--invite"
          name="server_code"
          placeholder={EXAMPLE_JWT}
          value={inviteForm.invite}
          onChange={e => setInviteForm({...inviteForm, invite: e.target.value})}
        />
      </Fragment>
    );
  } else if (buoys.count() === 0) {
    content = (
      <Fragment>
        <h1>welcome</h1>
        <p>
          hmm, looks like you haven't joined a buoy yet. <a onClick={() => setScreen(SCREEN_INVITE)}>have an invite code?</a>
        </p>
      </Fragment>
    );
  } else if (screen === SCREEN_CREATE_ROOM) {
    content = (
      <Fragment>
        <h2>create room</h2>
        <label>room name:</label>
        <input
          type="text"
          placeholder="da best music"
          value={createForm.name}
          onChange={e => setCreateForm({...createForm, name: e.target.value})}
        />
        <button
          disabled={createForm.name.length === 0}
          onClick={() => dispatch(Actions.createRoom({
            ...createForm,
            callback: onCreateSuccess,
          }))}
        >
          create room
        </button>
      </Fragment>
    );
  } else if (connectedBuoy && screen === SCREEN_DEFAULT) {
    content = (
      <Fragment>
        <h1>join a room</h1>
        <p>you are connected to {connectedBuoy.get('name')}</p>
        <div
          className={classNames([
            'room-selector--rooms',
            {none: rooms.count() === 0},
          ])}
        >
          {rooms.map((room) => {
            return (
              <div
                key={room.get('id')}
                className="room-selector--room"
                onClick={() => history.push(`/rooms/${room.get('id')}`)}
              >
                {room.get('name')}
              </div>
            );
          })}
          {rooms.count() === 0 && (
            <div className="room-selector--none">
              no rooms found.&nbsp;
              <span onClick={() => setScreen(SCREEN_CREATE_ROOM)}>
                create one?
              </span>
            </div>
          )}
        </div>
        {rooms.count() !== 0 && (
          <button onClick={() => setScreen(SCREEN_CREATE_ROOM)}>create room</button>
        )}
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div className="room-selector--dragbar" />
      <div className="room-selector--container">
        <div className="room-selector--box">
          {content}
        </div>
      </div>
    </Fragment>
  );
};

export default layout(withRouter(RoomSelectorPage));
