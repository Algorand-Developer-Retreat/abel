import { abel } from "./lib/config.js";
import { printView, parseArgvBigints } from "./lib/util.js";

const aids = parseArgvBigints()

await printView(aids, "MicroLabels", aids => abel.getAssetsMicroLabels(aids), false)
