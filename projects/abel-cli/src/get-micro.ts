import { abel } from "./lib/config.js";
import { parseArgvBigints } from "./lib/util.js";
import { printView } from "./lib/printView.js";

const aids = parseArgvBigints()

await printView(aids, "Micro", aids => abel.getAssetsMicro(aids), false)
