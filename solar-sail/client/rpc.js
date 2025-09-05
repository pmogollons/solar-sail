/* global Accounts */
import last from "lodash.last";
import isFunction from "lodash.isfunction";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";


export function getToken() {
  // @ts-expect-error - _storedLoginToken is not typed
  return Accounts._storedLoginToken();
}

function apply(method, args, options, callback) {
  const headers = { "Content-Type": "application/ejson" };

  try {
    headers["Meteor-Authorization"] = getToken();
  } catch (e) {
    // Accounts may not be defined at this stage
  }

  fetch(Meteor.absoluteUrl("/__meteor"), {
    method: "POST",
    headers,
    body: EJSON.stringify({ method, args }),
  })
    .then(response => response.text())
    .then(text => EJSON.parse(text))
    .then(data => callback && callback(undefined, data.result));
}

async function applyAsync(method, args, options) {
  const headers = { "Content-Type": "application/ejson" };

  try {
    headers["Meteor-Authorization"] = getToken();
  } catch (e) {
    // Accounts may not be defined at this stage
  }

  return queueFunction(
    (resolve, reject) => {
      // Your custom fetch logic
      fetch(Meteor.absoluteUrl("/__meteor"), {
        method: "POST",
        headers,
        body: EJSON.stringify({ method, args }),
      })
        .then(response => response.text())
        .then(text => EJSON.parse(text))
        .then(data => {
          resolve(data.result);
        })
        .catch(err => {
          reject(err);
        });
    },
    {
      // You can provide custom promise properties if needed
      stubPromise: new Promise((resolve, reject) => {
        resolve({ result: null });
      }), // or your stub logic
      serverPromise: new Promise((resolve, reject) => {
        resolve({ result: null });
      }), // or your server logic
    }
  );
}

function call(method, ...args) {
  let callback;
  if (isFunction(last(args))) {
    callback = last(args);
    args = args.slice(0, args.length - 1);
  }

  return apply(method, args, {}, callback);
}

async function callAsync(method, ...args) {
  return applyAsync(method, args, {});
}


let queueSize = 0;
let queue = Promise.resolve();

function queueFunction(fn, promiseProps = {}) {
  queueSize += 1;

  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  queue = queue.finally(() => {
    fn(resolve, reject);

    return promise.stubPromise?.catch(() => {}); // silent uncaught promise
  });

  promise
    .catch(() => {}) // silent uncaught promise
    .finally(() => {
      queueSize -= 1;
      if (queueSize === 0) {
        Meteor.connection._maybeMigrate();
      }
    });

  promise.stubPromise = promiseProps.stubPromise;
  promise.serverPromise = promiseProps.serverPromise;

  return promise;
}


export { apply, applyAsync, call, callAsync };