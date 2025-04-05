import { abel } from "../lib/config.js";
import { die, parseArgvBigints, printView } from "../lib/util.js";

const aids = parseArgvBigints()

await printView(aids, "micro", aids => abel.getAssetsMicro(aids))
await printView(aids, "micro+labels", aids => abel.getAssetsMicroLabels(aids))
await printView(aids, "tiny", aids => abel.getAssetsTinyLabels(aids))
await printView(aids, "tiny+labels", aids => abel.getAssetsTinyLabels(aids))
await printView(aids, "text+labels", aids => abel.getAssetsTextLabels(aids))
await printView(aids, "small", aids => abel.getAssetsSmall(aids))
await printView(aids, "full", aids => abel.getAssetsFull(aids))
