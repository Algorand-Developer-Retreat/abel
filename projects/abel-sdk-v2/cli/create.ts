import { writeFileSync } from "fs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK, AssetLabelingClient, AssetLabelingFactory } from "../dist";
import { Config } from "@algorandfoundation/algokit-utils";

const LABEL_ID = process.env.LABEL_ID ?? "pv";
const LABEL_NAME = process.env.LABEL_NAME ?? "Pera Verified";
const ASSET_ID = 1002n;

Config.configure({ populateAppCallResources: false, debug: false, traceAll: false });

const algorand = AlgorandClient.fromEnvironment();
const deployer = await algorand.account.fromEnvironment("DEPLOYER");

const factory = algorand.client.getTypedAppFactory(AssetLabelingFactory, {
  defaultSender: deployer.addr,
});

const { appClient, result } = await factory.deploy({ ignoreCache: true, onUpdate: "append", onSchemaBreak: "append" });

// If app was just created fund the app account
if (["create", "replace"].includes(result.operationPerformed)) {
  await algorand.send.payment({
    amount: (0.1).algo(),
    sender: deployer.addr,
    receiver: appClient.appAddress,
  });
}

const { appId } = appClient;

writeFileSync(".appid", String(appId));
console.log("Wrote", ".appid", appId);

const operator = deployer.addr;

const sdk = new AbelSDK({ algorand, appId, writeAccount: deployer });

async function logAllState() {
  const labels: string[] = await sdk.getAllLabels();
  const operators: string[] = await sdk.getAllOperators();
  const assets: bigint[] = await sdk.getAllAssetIDs();

  const labelDescriptors = await sdk.getLabelDescriptors(labels);
  const operatorLabels = await Promise.all(operators.map((o) => sdk.getOperatorLabels(o)));
  const assetLabels = await sdk.getAssetsLabels(assets);

  console.dir({ labels: labelDescriptors, operators: [operators, operatorLabels], assetLabels });
}

await logAllState();

const existingLabels = await sdk.getAllLabels();
if (!existingLabels.includes(LABEL_ID)) {
  console.log("creating label");
  await sdk.addLabel(LABEL_ID, LABEL_NAME);
}

console.log("getOperatorLabels");
let operatorLabels = await sdk.getOperatorLabels(operator);

if (!operatorLabels.includes(LABEL_ID)) {
  console.log("adding operator to label");
  await sdk.addOperatorToLabel(operator, LABEL_ID);
}
operatorLabels = await sdk.getOperatorLabels(operator);
console.log({ operatorLabels });

console.log("get all operators", await sdk.getAllOperators());

if (!(await sdk.getAssetLabels(ASSET_ID)).includes(LABEL_ID)) {
  console.log("add label to asset");
  await sdk.addLabelToAsset(ASSET_ID, LABEL_ID);
}

const assetLabels = await sdk.getAssetLabels(ASSET_ID);
console.log({ assetLabels });

console.log("multi with nonexist")
console.log(await sdk.getAssetsLabels([3832n, ASSET_ID]))


await logAllState();
if (process.env.STOP)
  process.exit(1);


console.log("removing label from asset");
await sdk.removeLabelFromAsset(ASSET_ID, LABEL_ID);

console.log(await sdk.getLabelDescriptors(["pv"]));

console.log("removing operator from label");
await sdk.removeOperatorFromLabel(operator, LABEL_ID);

console.log("removing operator from label");
await sdk.removeLabel(LABEL_ID);

