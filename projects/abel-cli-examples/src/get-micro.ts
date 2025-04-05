import { abel } from "./lib/config.js";
import { printView } from "./lib/util.js";

const aids = process.argv.slice(2).map(n => BigInt(n))

await printView(aids, "micro", aids => abel.getAssetsMicro(aids), true)
