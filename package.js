Package.describe({
  summary: "Solar Sail - Improved Meteor's latency-compensated distributed data client",
  version: "3.1.1",
  documentation: null,
  name: "ddp-client",
});

Npm.depends({
  "@sinonjs/fake-timers": "7.0.5",
  "lodash.has": "4.5.2",
  "lodash.identity": "3.0.0",
});

Package.onUse((api) => {
  api.use(
    [
      "check",
      "random",
      "ejson",
      "tracker",
      "retry",
      "id-map",
      "ecmascript",
      "callback-hook",
      "ddp-common",
      "reload",
      "socket-stream-client",

      // we depend on _diffObjects, _applyChanges,
      "diff-sequence",

      // _idParse, _idStringify.
      "mongo-id",

      "fetch",
      "webapp",
    ],
    ["client", "server"]
  );

  api.use("reload", "client", { weak: true });

  api.export("DDP");
  api.mainModule("solar-sail/client/client.js", "client");
  api.addFiles(["solar-sail/server/index.js"], "server");
  api.mainModule("server/server.js", "server");
});

Package.onTest((api) => {
  api.use([
    "livedata",
    "mongo",
    "test-helpers",
    "ecmascript",
    "tinytest",
    "random",
    "tracker",
    "reactive-var",
    "mongo-id",
    "diff-sequence",
    "ejson",
    "ddp-common",
    "check",

    "fetch",
    "webapp",
  ]);

  api.addFiles("test/stub_stream.js");
  api.addFiles("test/livedata_connection_tests.js");
  api.addFiles("test/livedata_tests.js");
  api.addFiles("test/livedata_test_service.js");
  api.addFiles("test/random_stream_tests.js");
  api.addFiles("test/async_stubs/client.js", "client");
  api.addFiles("test/async_stubs/server_setup.js", "server");
  api.addFiles("test/livedata_callAsync_tests.js");
  api.addFiles("test/allow_deny_setup.js");
});
