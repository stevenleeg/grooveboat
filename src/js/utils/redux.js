import Immutable from 'immutable';

export const createAction = (type) => {
  return (args) => {
    return {
      type,
      ...args,
    };
  };
};

export const combineReducers = (reducerBlocks) => {
  const reducers = new Immutable.Map(reducerBlocks);

  return (state, action) => {
    return reducers.map((reducer, key) => {
      return reducer(state ? state.get(key) : undefined, action);
    });
  };
};

export const createReducer = ({initialState, callbacks}) => {
  return (state, action) => {
    return callbacks
      .filter(callback => callback.actionType === action.type)
      .reduce((prevState, callback) => {
        return callback.callback(prevState, action);
      }, state ? initialState.merge(state) : initialState);
  };
};
