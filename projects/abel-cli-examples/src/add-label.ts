import { abel } from "./lib/config.js";
import { parseArgs, wrapAction } from "./lib/util.js";

wrapAction("(admin) Add label (id, name)", parseArgs(String, String), abel.addLabel);
