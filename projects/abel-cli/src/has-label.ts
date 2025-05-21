import { abel } from "./lib/config.js";
import { parseArgs } from "./lib/util.js";

const [aid, label] = parseArgs(BigInt, String);

console.log(await abel.hasAssetLabel(aid, label));
