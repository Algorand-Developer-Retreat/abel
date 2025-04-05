import { abel } from "./lib/config.js";
import { parseArgs, wrapAction } from "./lib/util.js";

wrapAction("(admin) Remove operator from label (operator_address, label_id)", parseArgs(String, String), abel.removeOperatorFromLabel);
