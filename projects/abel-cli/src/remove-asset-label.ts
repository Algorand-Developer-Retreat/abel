import { abel } from "./lib/config.js";
import { parseArgs } from "./lib/util.js";
import { wrapAction } from "./lib/wrap-action.js";

wrapAction("(admin) Remove asset from label (asset_id, label_id)", parseArgs(BigInt, String), abel.removeLabelFromAsset);
