import { abel } from "./lib/config.js";
import { parseArgvBigints } from "./lib/util.js";
import { printView } from "./lib/printView.js";

await printView([], "Get all asset IDs", aids => abel.getAllAssetIDs(), false)
