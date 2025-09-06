import { Meteor } from "meteor/meteor";


let originalCallLoginMethod;

Meteor.startup(() => {
  originalCallLoginMethod = Accounts.callLoginMethod;
});

export function engage() {
  Meteor.startup(() => {
    Accounts.callLoginMethod = originalCallLoginMethod;
  });
}

export function disengage() {
  Meteor.startup(() => {
    Accounts.callLoginMethod = function callLoginMethod(options) {
      options = {
        methodName: "login",
        methodArguments: [{}],
        _suppressLoggingIn: false,
        ...options,
      };

      // Set defaults for callback arguments to no-op functions; make sure we
      // override falsey values too.
      ["validateResult", "userCallback"].forEach(f => {
        if (!options[f]) {
          options[f] = () => null;
        }
      });

      let called;
      // Prepare callbacks: user provided and onLogin/onLoginFailure hooks.
      const loginCallbacks = ({ error, loginDetails }) => {
        if (!called) {
          called = true;
          if (!error) {
            this._onLoginHook.forEach(callback => {
              callback(loginDetails);
              return true;
            });
            this._loginCallbacksCalled = true;
          } else {
            this._loginCallbacksCalled = false;
            this._onLoginFailureHook.forEach(callback => {
              callback({ error });
              return true;
            });
          }
          options.userCallback(error, loginDetails);
        }
      };

      // We dont need to wait to be connected for this to succeed
      const onResultReceived = (err, result) => {
        if (err || !result || !result.token) {
          // Leave onReconnect alone if there was an error, so that if the user was
          // already logged in they will still get logged in on reconnect.
          // See issue #4970.
        } else {
          // If our token was updated in storage, use the latest one.
          const storedToken = this._storedLoginToken();

          if (storedToken) {
            result = {
              token: storedToken,
              tokenExpires: this._storedLoginTokenExpires(),
            };
          }

          if (!result.tokenExpires) {
            result.tokenExpires = this._tokenExpiration(new Date());
          }

          if (this._tokenExpiresSoon(result.tokenExpires)) {
            this.makeClientLoggedOut();
          }
        }
      };

      const setUser = async (result) => {
        const { user } = await Meteor.callAsync("named_query_usersLoginQuery", { userId: result.id });

        Meteor.users._collection.upsert({ _id: user._id }, { $set: { ...user } });
      };

      const loggedInAndDataReadyCallback = (error, result) => {
        // Note that we need to call this even if _suppressLoggingIn is true,
        // because it could be matching a _setLoggingIn(true) from a
        // half-completed pre-reconnect login method.
        if (error || !result) {
          error = error || new Error(
            `No result from call to ${options.methodName}`
          );
          loginCallbacks({ error });
          this._setLoggingIn(false);
          return;
        }

        try {
          options.validateResult(result);
        } catch (e) {
          loginCallbacks({ error: e });
          this._setLoggingIn(false);
          return;
        }

        // Make the client logged in. (The user data should already be loaded!)
        this.makeClientLoggedIn(result.id, result.token, result.tokenExpires);
        setUser(result);

        // use Tracker to make we sure have a user before calling the callbacks
        Tracker.autorun(async (computation) => {
          const user = await Tracker.withComputation(computation, () =>
            Meteor.userAsync(),
          );

          if (user) {
            loginCallbacks({ loginDetails: result });
            this._setLoggingIn(false);
            computation.stop();
          }
        });
      };

      if (!options._suppressLoggingIn) {
        this._setLoggingIn(true);
      }

      this.connection.applyAsync(
        options.methodName,
        options.methodArguments,
        { wait: true, onResultReceived },
        loggedInAndDataReadyCallback);
    };
  });
}