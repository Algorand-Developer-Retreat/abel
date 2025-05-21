import { abel } from "./lib/config.js";
import { parseArgs } from "./lib/util.js";
import { wrapAction } from "./lib/wrap-action.js";

wrapAction("(admin) Add label to asset (asset_id, label_id)", parseArgs(BigInt, String), abel.addLabelToAsset);
