import { DDP } from "../../common/namespace.js";

import SolarSailModel from "./solarSail";
import { engage, disengage } from "./engager";

disengage();

DDP.engage = engage;
DDP.disengage = disengage;

const SolarSail = new SolarSailModel();

export { DDP, SolarSail };
