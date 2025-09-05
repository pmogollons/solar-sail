# 🌌 Solar Sail – Conditional DDP Client

Solar Sail is an extension of [`ddp-client`](https://github.com/meteor/meteor/tree/devel/packages/ddp-client), inspired by [Fusion](https://github.com/cult-of-coders/fusion).  
It allows you to **conditionally start or stop** the DDP (websocket) connection in your Meteor app, enabling lighter and more efficient client–server communication.


## 🚀 Why Solar Sail?

WebSockets are powerful but expensive:  
- They consume persistent resources.  
- Many apps don’t need live subscriptions everywhere.  
- Sometimes you only want real-time data in specific areas of your app.  

With Solar Sail, you can **disable the websocket by default** and still use `Meteor.callAsync` seamlessly over HTTPS. Then, when subscriptions are needed, you can **start DDP on demand**.

## ⚙️ How it Works

- By default, the websocket is disabled.  
- All `Meteor.call` and `Meteor.callAsync` requests transparently fall back to HTTPS (no code changes required).  
- When you need publications or reactive data, you simply **engage DDP**.  
- You can disengage anytime to save resources.

Example:  

```js
import { DDP } from "meteor/ddp-client";

// Start websocket connection
DDP.engage();

// Stop websocket connection
DDP.disengage();
```

Subscriptions can be wrapped in an engage call, so you only connect when necessary. If all engaged handlers are stopped, the websocket connection is automatically closed.

```js
import { SolarSail } from "meteor/ddp-client";

const handler = SolarSail.engage(() => {
  Meteor.subscribe("posts");
});

// Later, when you’re done:
handler.stop();
```

## 📦 Installation

```bash
# In your Meteor App
mkdir packages
cd packages
git clone https://github.com/pmogollons/solar-sail.git
```

> ⚠️ Not on Atmosphere:
This package overrides ddp-client behavior, so it cant be published as a package. The long-term goal is to merge these improvements into Meteor core.


## 🔐 Authentication Support

When using HTTPS calls, Solar Sail still preserves authentication:

* The client automatically sends Accounts._storedLoginToken() with each request.
* On the server, this.userId works as expected in your methods.

✅ Works with accounts-password and compatible auth packages.


## ✨ Features Recap
* Websocket disabled by default
* Meteor.call & Meteor.callAsync work via HTTPS transparently
* Conditional DDP engagement (DDP.engage / DDP.disengage)
* SolarSail class for component-level connection management
* Automatic auth token forwarding
* No need to rewrite your methods

## 🙏 Acknowledgements
Solar Sail builds on the great work of [Theodor Diaconu](https://github.com/theodorDiaconu) and the [Fusion](https://github.com/cult-of-coders/fusion) project.