import { writeFileSync } from "fs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK, AssetLabelingClient, AssetLabelingFactory } from "../dist";
import { Config } from "@algorandfoundation/algokit-utils";

const LABEL_ID = process.env.LABEL_ID ?? "pv";
const LABEL_NAME = process.env.LABEL_NAME ?? "Pera Verified";
const ASSET_ID = 1002n

Config.configure({ populateAppCallResources: false, debug: false, traceAll: false });

const algorand = AlgorandClient.fromEnvironment();
const deployer = await algorand.account.fromEnvironment("DEPLOYER");

const factory = algorand.client.getTypedAppFactory(AssetLabelingFactory, {
  defaultSender: deployer.addr,
});

const { appClient, result } = await factory.deploy({ ignoreCache: true, onUpdate: "append", onSchemaBreak: "append" });

// If app was just created fund the app account
if (['create', 'replace'].includes(result.operationPerformed)) {
  await algorand.send.payment({
    amount: (0.1).algo(),
    sender: deployer.addr,
    receiver: appClient.appAddress,
  })
}

const { appId } = appClient;

writeFileSync(".appid", String(appId));
console.log("Wrote", ".appid", appId);

const operator = deployer.addr;

const sdk = new AbelSDK({ algorand, appId, writeAccount: deployer });

const existingLabels = await sdk.getLabelDescriptors(['pv'])
console.log({existingLabels})

if (!existingLabels.has(LABEL_ID)) {
  await sdk.addLabel(LABEL_ID, LABEL_NAME);
}

let operatorLabels: string[] = []
try {
   operatorLabels = await sdk.getOperatorLabels(operator)
} catch(e) {
  if (e.message !== "ERR:NOEXIST") {
      throw e
  }
}

if (!operatorLabels.includes(LABEL_ID)) {
  console.log("adding operator to label")
  await sdk.addOperatorToLabel(operator, LABEL_ID)
}

operatorLabels = await sdk.getOperatorLabels(operator)

console.log({operatorLabels});

if (!(await sdk.getAssetLabels(ASSET_ID)).includes(LABEL_ID)) {
  console.log("add label to asset")
  await sdk.addLabelToAsset(ASSET_ID, LABEL_ID);
}

const assetLabels = await sdk.getAssetLabels(ASSET_ID)
console.log({assetLabels});

console.log(await sdk.getLabelDescriptors(['pv']))
console.log("removing label from asset")
await sdk.removeLabelFromAsset(ASSET_ID, LABEL_ID)

console.log(await sdk.getLabelDescriptors(['pv']))

console.log("removing operator from label")
await sdk.removeOperatorFromLabel(operator, LABEL_ID)

