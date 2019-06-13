import React from 'react';
import {Link} from 'react-router-dom';

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
