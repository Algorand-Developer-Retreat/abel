import { abel } from "./lib/config.js";
import { printView, parseArgvBigints } from "./lib/util.js";

await printView([], "Get all asset IDs", aids => abel.getAllAssetIDs(), false)
