import { abel } from "./lib/config.js";
import { parseArgs } from "./lib/util.js";
import { wrapAction } from "./lib/wrap-action.js";

wrapAction("(admin) Add operator to label (operator_address, label_id)", parseArgs(String, String), abel.addOperatorToLabel);
