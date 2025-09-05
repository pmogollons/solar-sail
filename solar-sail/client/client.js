import { DDP } from "../../common/namespace.js";

import "../../common/livedata_connection.js";

// Initialize the default server connection and put it on Meteor.connection
import "../../client/client_convenience.js";

import SolarSailModel from "./solar-sail";
import { engage, disengage } from "./engager";

disengage();

DDP.engage = engage;
DDP.disengage = disengage;

const SolarSail = new SolarSailModel();

export { DDP, SolarSail };
