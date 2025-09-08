/* global Accounts: true, __meteor_runtime_config__: true,Package: true,Retry: true */
import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";

import { DDP } from "../../common/namespace";
import { call, apply, callAsync, applyAsync } from "./rpc";
import { engage as engageAccounts, disengage as disengageAccounts } from "./accounts";


const _methods = [];

export function engage() {
  if (Meteor.connection._isDummy) {
    engageAccounts();
    createActualConnection();
  }
}

export function disengage() {
  if (!Meteor.connection || !Meteor.connection._isDummy) {
    disengageAccounts();
    createDummyConnection();
  }
}

async function createActualConnection() {
  Meteor.refresh = () => {};
  const ddpUrl = __meteor_runtime_config__?.DDP_DEFAULT_CONNECTION_URL || "/";
  const retry = new Retry();

  const onDDPVersionNegotiationFailure = function(description) {
    Meteor._debug(description);
    if (Package.reload) {
      const migrationData = Package.reload.Reload._migrationData("livedata") || Object.create(null);
      let failures = migrationData.DDPVersionNegotiationFailures || 0;
      ++failures;
      Package.reload.Reload._onMigrate("livedata", () => [true, { DDPVersionNegotiationFailures: failures }]);
      retry.retryLater(failures, () => {
        Package.reload.Reload._reload({ immediateMigration: true });
      });
    }
  };

  if (!Meteor._stubsLoaded) {
    const { loadAsyncStubHelpers } = await import("../../client/queue_stub_helpers");

    loadAsyncStubHelpers();

    Meteor._stubsLoaded = true;
  }

  Meteor.connection = await DDP.connect(ddpUrl, {
    onDDPVersionNegotiationFailure: onDDPVersionNegotiationFailure,
  });
  Accounts.connection = Meteor.connection;
  // TODO: Some connections might be still using the old dummy connection

  _mirrorMeteorObject();

  _methods.forEach(config => {
    Meteor.methods(config);
  });
}

export function createDummyConnection() {
  if (Meteor.connection) {
    Meteor.connection.disconnect();
  }

  Meteor.connection = {
    _isDummy: true,

    _userId: null,
    _userIdDeps: new Tracker.Dependency(),
    userId() {
      if (this._userIdDeps) {
        this._userIdDeps.depend();
      }
      return this._userId;
    },
    setUserId(userId) {
      // Avoid invalidating dependents if setUserId is called with current value.
      if (this._userId === userId) {
        return;
      }
      this._userId = userId;
      if (this._userIdDeps) {
        this._userIdDeps.changed();
      }
    },

    subscribe() {
      Meteor.isDevelopment && console.warn("You cannot subscribe, the connection is not engaged.");
      return {
        ready() {
          return true;
        },
        stop() {
          return false;
        },
      };
    },
    methods(config) {
      _methods.push(config);
      Meteor.isDevelopment && console.warn("Does not work with .methods() client-side");
    },
    status() {
      return {
        connected: false,
        status: "offline",
        reason: "You are using solar sail",
        retryCount: 0,
        retryTime: 0,
        retryDelay: 0,
        retryTimeout: 0,
        retryMaxDelay: 0,
      };
    },
    reconnect() {},
    disconnect() {},
    call,
    apply,
    callAsync,
    applyAsync,
    isAsyncCall: () => false,
    _maybeMigrate() {},
    registerStoreClient: () => {},
    _stream: {
      _isStub: true,
    },
  };
  Meteor.startup(() => {
    Accounts.connection = Meteor.connection;
  });

  _mirrorMeteorObject();
}

function _mirrorMeteorObject() {
  [
    "subscribe",
    "methods",
    "isAsyncCall",
    "call",
    "apply",
    "callAsync",
    "applyAsync",
    "status",
    "reconnect",
    "disconnect",
  ].forEach(name => {
    Meteor[name] = Meteor.connection[name].bind(Meteor.connection);
  });
}