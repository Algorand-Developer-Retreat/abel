import { readFileSync } from "fs";
import pMap from "p-map";
import { config, abel, LABEL_ID } from "../lib/config.js";
import { getAssetsWithLabelPV } from "../lib/util.js";

// Read assets from JSON file structured like Pera Verified response
const data = JSON.parse(readFileSync(process.argv[2]).toString());

const latestAssetIds = data.map(({ asset_id: aid }: { asset_id: number }) => BigInt(aid));
const existingAssetIds = await getAssetsWithLabelPV(abel, LABEL_ID);

const toAdd = [];
for (const maybeNew of latestAssetIds) {
  if (!existingAssetIds.includes(maybeNew)) {
    toAdd.push(maybeNew);
  }
}

const toRemove = [];
for (const maybeExpired of existingAssetIds) {
  if (!latestAssetIds.includes(maybeExpired)) {
    toRemove.push(maybeExpired);
  }
}

console.log({
  latestAssets: latestAssetIds.length,
  existingAssets: existingAssetIds.length,
  toAdd: toAdd.length,
  toRemove: toRemove.length,
});

if (toAdd.length) {
  console.log(`Adding (${toAdd.length})`);
  await abel.addLabelToAssets(toAdd, LABEL_ID);
}

if (toRemove.length) {
  console.log(`Removing (${toRemove.length})`);
  await pMap(toRemove, (id) => abel.removeLabelFromAsset(id, LABEL_ID), { concurrency: config.CONCURRENCY });
}
