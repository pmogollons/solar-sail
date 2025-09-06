import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";

import { DDP } from "../../common/namespace";
import { call, apply, callAsync, applyAsync } from "./rpc";
import { engage as engageAccounts, disengage as disengageAccounts } from "./accounts";


const _methods = [];

export function engage() {
  if (Meteor.connection._isDummy) {
    createActualConnection();
    engageAccounts();
  }
}

export function disengage() {
  if (!Meteor.connection || !Meteor.connection._isDummy) {
    createDummyConnection();
    disengageAccounts();
  }
}

function createActualConnection() {
  let ddpUrl = "/";
  if (typeof __meteor_runtime_config__ !== "undefined") {
    if (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL) {
      ddpUrl = __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL;
    }
  }

  const retry = new Retry();

  const onDDPVersionNegotiationFailure = function(description) {
    Meteor._debug(description);
    if (Package.reload) {
      const migrationData = Package.reload.Reload._migrationData("livedata") || {};
      let failures = migrationData.DDPVersionNegotiationFailures || 0;
      ++failures;
      Package.reload.Reload._onMigrate("livedata", function() {
        return [true, { DDPVersionNegotiationFailures: failures }];
      });
      retry.retryLater(failures, function() {
        Package.reload.Reload._reload();
      });
    }
  };

  Meteor.connection = DDP.connect(ddpUrl, {
    onDDPVersionNegotiationFailure: onDDPVersionNegotiationFailure,
  });

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
    _maybeMigrate() {},
    registerStoreClient: () => {},
    _stream: {
      _isStub: true,
    },
  };

  _mirrorMeteorObject();
}

function _mirrorMeteorObject() {
  [
    "subscribe",
    "methods",
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