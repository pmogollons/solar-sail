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

  const response = await fetch(Meteor.absoluteUrl("/__meteor"), {
    method: "POST",
    headers,
    body: EJSON.stringify({ method, args }),
  });

  return EJSON.parse(await response.text());
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


export { apply, applyAsync, call, callAsync };