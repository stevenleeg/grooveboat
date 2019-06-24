import React, {Fragment} from 'react';
import {useSelector} from 'react-redux';

import {
  Selectors as ToasterSelectors,
} from '../services/toaster';

const Toaster = () => {
  const notifications = useSelector(ToasterSelectors.notifications);
  return (
    <Fragment>
      {notifications.map((notification) => {
        const key = `${notification.get('title')}${notification.get('message')}`;
        const icon = notification.get('icon') || '✋';

        return (
          <div className="toast" key={key}>
            <div className="icon">{icon}</div>
            <div className="content">
              <div className="title">{notification.get('title')}</div>
              <div className="message">{notification.get('message')}</div>
            </div>
          </div>
        );
      })}
    </Fragment>
  );
};

export default Toaster;
