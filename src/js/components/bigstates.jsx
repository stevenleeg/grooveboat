import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';

import {useInterval} from '../utils/react';

export const LoadingState = ({title, subtitle}) => {
  return (
    <div className="bigstates--loading">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
};

export const ErrorState = ({message}) => {
  return (
    <div className="bigstates--error">
      <h1>yikes</h1>
      <p>{message}</p>
      <p><Link to="/">go back</Link></p>
    </div>
  );
};

export const ApplicationError = () => {
  const [seconds, setSeconds] = useState(5);

  useInterval(() => {
    setSeconds(seconds - 1);
  }, seconds <= 0 ? null : 1000);

  useEffect(() => {
    if (seconds === 0) {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    }
  }, [seconds]);

  return (
    <div className="bigstates--application-error">
      <h1>ugh</h1>
      <p>
        grooveboat seems to have crashed.if you know what may have caused this
        issue, consider opening an issue on the project's
        {' '}
        <a
          rel="noopener noreferrer"
          href="https://github.com/stevenleeg/grooveboat/issues"
          target="_blank"
        >
        bug tracker
        </a>
        .
      </p>
      <p>
        <b>this page will automagically refresh in {seconds}...</b>
      </p>
    </div>
  );
};
