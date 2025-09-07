import { DDP } from "../../common/namespace.js";

// Initialize the default server connection and put it on Meteor.connection
import "../../client/client_convenience.js";

import SolarSailModel from "./solarSail";
import { engage, disengage } from "./engager";

disengage();

DDP.engage = engage;
DDP.disengage = disengage;

const SolarSail = new SolarSailModel();

export { DDP, SolarSail };
