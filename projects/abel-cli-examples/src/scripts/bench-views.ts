import { abel } from "./lib/config.js";
import { die, printView } from "./lib/util.js";

const aids = process.argv.slice(2).map(n => BigInt(n))
if (!aids.length)
  die("Provide asset IDs as arguments")

await printView(aids, "micro", aids => abel.getAssetsMicro(aids))
await printView(aids, "micro+labels", aids => abel.getAssetsMicroLabels(aids))
await printView(aids, "tiny", aids => abel.getAssetsTinyLabels(aids))
await printView(aids, "tiny+labels", aids => abel.getAssetsTinyLabels(aids))
await printView(aids, "text+labels", aids => abel.getAssetsTextLabels(aids))
await printView(aids, "small", aids => abel.getAssetsSmall(aids))
await printView(aids, "full", aids => abel.getAssetsFull(aids))
