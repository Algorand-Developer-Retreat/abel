import { abel } from "./lib/config.js";
import { parseArgs, wrapAction } from "./lib/util.js";

wrapAction("(admin) Add label to asset (asset_id, label_id)", parseArgs(BigInt, String), abel.addLabelToAsset);
