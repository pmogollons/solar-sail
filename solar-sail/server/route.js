/* global DDPCommon, Package, Accounts */
import bodyParser from "body-parser";
import { Match } from "meteor/check";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";

import { DDP } from "../../server/server.js";


WebApp.handlers.use(bodyParser.raw({
  "type": "application/ejson",
}));

async function getUserIdByToken(token) {
  const user = await Meteor.users.findOneAsync({
    "services.resume.loginTokens.hashedToken": Accounts._hashLoginToken(token),
  }, { fields: { _id: 1 } });

  return user && user._id;
}

WebApp.handlers.post("/__meteor", async function(req, res) {
  const body = req.body.toString();
  const data = EJSON.parse(body);

  // @ts-expect-error - Meteor.server is not typed
  const handler = Meteor.server.method_handlers[data.method];
  if (!handler) {
    res.statusCode = 404;
    res.end(EJSON.stringify({ reason: "Method not found" }));

    return;
  }

  try {
    const context = {
      userId: null,
      connection: {},
      unblock() {},
      setUserId(userId) {
        this.userId = userId;
      },
    };

    if (req.headers["meteor-authorization"]) {
      context.userId = await getUserIdByToken(req.headers["meteor-authorization"]);
    }

    // @ts-expect-error - DDPCommon is not typed
    const invocation = new DDPCommon.MethodInvocation({
      isSimulation: false,
      userId: context.userId,
      setUserId(userId) {
        this.userId = userId;
      },
      connection: {},
      randomSeed: null,
    });

    const response = await DDP._CurrentMethodInvocation.withValue(invocation, () =>
      maybeAuditArgumentChecks(
        handler,
        invocation,
        data.args,
        "internal call to '" + data.method + "'"
      )
    );

    res.end(EJSON.stringify(response));
  } catch (e) {
    console.error(e);

    res.statusCode = 500;
    res.end(EJSON.stringify({ reason: e.reason || e.toString() }));

    return;
  }
});

// Audit argument checks, if the audit-argument-checks package exists (it is a
// weak dependency of this package).
function maybeAuditArgumentChecks(f, context, args = [], description) {
  if (Package["audit-argument-checks"]) {
    // @ts-expect-error - Match is not typed
    return Match._failIfArgumentsAreNotAllChecked(f, context, args, description);
  }

  return f.apply(context, args);
}