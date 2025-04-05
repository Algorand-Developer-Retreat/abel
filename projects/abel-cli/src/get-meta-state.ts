import { abel } from "./lib/config.js";

async function getMetaState() {
  const labels: string[] = await abel.getAllLabels();
  const operators: string[] = await abel.getAllOperators();
  const assets: bigint[] = await abel.getAllAssetIDs();

  const labelDescriptors = await abel.getLabelDescriptors(labels);
  const operatorLabels = Object.fromEntries(await Promise.all(
    operators.map((operator) => abel.getOperatorLabels(operator).then((labels) => ([operator, labels ])))
  ));

  return { labels: labelDescriptors, operatorLabels, totalAssetCount: assets.length };
}

console.log(await getMetaState());
