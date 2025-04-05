import { abel } from "./lib/config.js";
import { parseArgs, wrapAction } from "./lib/util.js";

wrapAction("(admin) Remove label (id)", parseArgs(String), abel.removeLabel);
