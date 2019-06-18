import Immutable from 'immutable';
import PouchDB from 'pouchdb-browser';

const db = new PouchDB('grooveboat');

const get = (id, options = {}) => db.get(id, options).then((result) => {
  return Immutable.fromJS(result);
});

const put = (doc) => {
  if (!Immutable.isImmutable(doc)) return db.put(doc);
  return db.put(doc.toJS());
};

const remove = (doc) => {
  if (!Immutable.isImmutable(doc)) return db.remove(doc);
  return db.remove(doc.toJS());
};

export default {
  ...db,
  remove,
  get,
  put,
};
