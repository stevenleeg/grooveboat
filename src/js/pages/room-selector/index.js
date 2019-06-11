import React, {Fragment, useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import JWT from 'jsonwebtoken';

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

const RoomSelectorPage = () => {
  ////
  // Hooks
  //
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    invite: '',
    roomName: '',
  });
  const [createForm, showCreateForm] = useState({
    name: 'da best music',
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
      try {
        token = JWT.decode(inviteForm.invite)
      } catch (e) {
        token = null;
        return;
      }

      if (token.u) {
        dispatch(Actions.joinBuoy({inviteCode: inviteForm.invite}));
      }
    }
  }, [inviteForm]);

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
  } else if (showInvite) {
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
          hmm, looks like you haven't joined a buoy yet. <a onClick={() => setShowInvite(true)}>have an invite code?</a>
        </p>
      </Fragment>
    );
  } else if (connectedBuoy) {
    content = (
      <Fragment>
        <h1>join a room</h1>
        <p>you are connected to {connectedBuoy.get('name')}</p>
        {rooms.map((room) => {
          return (
            <div key={room.id} className="room-selector--room">
              {room.name}
            </div>
          );
        })}
        <hr />
        <label>room name:</label>
        <input
          type="text"
          placeholder="da best music"
          value={createForm.name}
          onChange={() => setCreateForm({...createForm, name: e.target.value})}
        />
        <button
          onClick={() => Actions.createRoom({...createForm})}
        >
          create room
        </button>
      </Fragment>
    );
  }

  return (
    <div className="room-selector--container">
      <div className="room-selector--box">
        {content}
      </div>
    </div>
  );
};

export default layout(RoomSelectorPage);
