import React from 'react';

export default Component => (props) => {
  return (
    <div className="container">
      <Component {...props} />
    </div>
  );
};
