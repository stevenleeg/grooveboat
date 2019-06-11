import React from 'react';

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
    </div>
  );
};
