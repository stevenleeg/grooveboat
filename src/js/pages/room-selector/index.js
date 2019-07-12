import React, {Fragment, useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {withRouter} from 'react-router';
import classNames from 'classnames';

import {
  Selectors as RoomSelectors,
} from '../../services/rooms';
import {
  Selectors as BuoySelectors,
} from '../../services/buoys';
import layout from '../../components/layout';
import {Actions} from './data';

const SCREEN_CREATE = 'create';
const SCREEN_SELECT = 'select';

const FAQ = [
  {
    question: '❓ what is this?',
    answer: (
      <Fragment>
        <p>
          grooveboat is a website that lets you play music with your friends.
        </p>
        <p>
          join a room and you'll be able to sit back and listen to a radio
          stream created by real live humans. if you're feeling fiesty you can
          queue up some music of your own and dj for the rest of the room.
        </p>
      </Fragment>
    ),
  },
  {
    question: '✨ why does this exist?',
    answer: (
      <Fragment>
        <p>
          the maintainers of grooveboat believe that humans make better
          playlists than algorithms. we also think that music is an amazing
          way to bring people together and form awesome online communities.
        </p>
        <p>
          grooveboat was made in honor of the late <a href="https://en.wikipedia.org/wiki/Turntable.fm" target="_blank" rel="noopener noreferrer">turntable.fm</a>.
          it's an <a href="https://github.com/stevenleeg/grooveboat" target="_blank" rel="noopener noreferrer">open source</a> labor of love– meaning there are no business models or engagement metrics
          trying to keep you addicted.
        </p>
        <p>
          we want every room to be its own soverign community, with the
          ability to set its music taste, ideals, style, vibes as its members
          see fit. grooveboat is meant to cultivate weird and fun internet
          communities, centered around music.
        </p>
      </Fragment>
    ),
  },
  {
    question: '✍️ how can i contribute?',
    answer: (
      <Fragment>
        <p>
          if you like what you see here there are numerous ways to get
          involved:
        </p>
        <p>
          <b>stick around</b> and be a regular in a room you enjoy. this
          project is only as good as the communities built on it, and
          communities need long-lasting members.
        </p>
        <p>more to come here...</p>
      </Fragment>
    ),
  },
];

const RoomSelectorPage = ({history}) => {
  ////
  // Hooks
  //
  const rooms = useSelector(RoomSelectors.rooms);
  const storedRooms = useSelector(RoomSelectors.storedRooms);
  const isConnecting = useSelector(BuoySelectors.isConnecting);
  const connectedBuoy = useSelector(BuoySelectors.connectedBuoy);
  const dispatch = useDispatch();

  const [room, setRoom] = useState({name: ''});
  const [screen, setScreen] = useState(SCREEN_SELECT);
  const [openFAQ, setOpenFAQ] = useState(0);

  useEffect(() => {
    dispatch(Actions.init());
  }, []);

  ////
  // Action callbacks
  //
  const createRoom = () => {
    dispatch(Actions.createRoom({
      ...room,
      callback: ({room: r}) => history.push(`/rooms/${r.get('id')}`),
    }));
  };

  ////
  // Rendering
  //
  return (
    <div className="room-selector--container">
      <div className="room-selector--description">
        <div className="logo">🕺🚢</div>
        <h1>welcome to grooveboat</h1>
        {FAQ.map((item, i) => {
          const open = openFAQ === i;
          return (
            <Fragment key={i}>
              <div
                className={classNames(['faq--question', {open}])}
                onClick={() => setOpenFAQ(i)}
              >
                {item.question}
              </div>
              {open && (
                <div className="faq--answer">{item.answer}</div>
              )}
            </Fragment>
          );
        })}
      </div>
      <div className="room-selector--selector">
        <h1>{screen === SCREEN_CREATE ? 'create' : 'join'} a room</h1>
        {isConnecting && (
          <div className="selector--connecting">
            <div className="icon">📞</div>
            <div className="text">connecting to server...</div>
          </div>
        )}
        {(!isConnecting && !connectedBuoy) && (
          <div className="selector--nobuoy">
            <div className="icon">🤔</div>
            <div className="text">can't establish connection with buoy. give it a sec and then refresh.</div>
          </div>
        )}
        {(connectedBuoy && screen === SCREEN_SELECT) && (
          <div className="selector--select">
            <p>
              you're connected to {connectedBuoy.get('name')}
            </p>
            {(rooms.count() > 0) && (
              <Fragment>
                <ul className="selector--rooms">
                  {rooms.map((r) => {
                    const filename = r.getIn(['nowPlaying', 'track', 'filename']);
                    let nowPlaying = 'nothing playing';
                    if (filename) {
                      nowPlaying = `🎶 ${filename}`;
                    }

                    return <li
                      key={r.get('id')}
                      onClick={() => history.push(`/rooms/${r.get('id')}`)}
                    >
                      <div className="room--name">{r.get('name')}</div>
                      <div className="room--nowplaying">{nowPlaying}</div>
                      <div className="room--meta">
                        👥 {r.get('peerCount')}
                      </div>
                    </li>;
                  })}
                </ul>
                <div className="selector--actions">
                  <button
                    type="button"
                    onClick={() => setScreen(SCREEN_CREATE)}
                  >
                    create room
                  </button>
                </div>
              </Fragment>
            )}

            {(storedRooms.count() > 0) && (
              <Fragment>
                <h2>inactive rooms</h2>
                <p>
                  the following are rooms you own but are currently inactive
                </p>
                <ul className="selector--rooms">
                  {storedRooms.map((r) => {
                    return <li
                      key={r.get('_id')}
                      onClick={() => history.push(r.get('_id'))}
                    >
                      <div className="room--name">{r.get('name')}</div>
                      <div className="room--nowplaying">Inactive</div>
                    </li>;
                  })}
                </ul>
              </Fragment>
            )}

            {(rooms.count() + storedRooms.count() === 0) && (
              <div className="selector--rooms-empty">
                <div className="icon">🙀</div>
                <div className="text">
                  no rooms yet. wanna{' '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => setScreen(SCREEN_CREATE)}
                  >
                    create one?
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {(connectedBuoy && screen === SCREEN_CREATE) && (
          <div className="selector--create">
            <div className="create--form">
              <label>room name:</label>
              <input
                type="text"
                placeholder="da club"
                onChange={e => setRoom({...room, name: e.target.value})}
                value={room.name}
              />
              <button type="button" onClick={createRoom}>create room</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default layout(withRouter(RoomSelectorPage));
