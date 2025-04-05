import { abel } from "./lib/config.js";
import { parseArgs, wrapAction } from "./lib/util.js";

wrapAction("(admin) Remove asset from label (asset_id, label_id)", parseArgs(BigInt, String), abel.removeLabelFromAsset);
