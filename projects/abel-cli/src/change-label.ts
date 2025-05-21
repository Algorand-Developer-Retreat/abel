import { abel } from "./lib/config.js";
import { parseArgs } from "./lib/util.js";
import { wrapAction } from "./lib/wrap-action.js";

wrapAction("(admin) Change label (id, name, url)", parseArgs(String, String, String), abel.changeLabel);
