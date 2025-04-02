import { writeFileSync } from "fs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK, AssetLabelingClient, AssetLabelingFactory } from "../dist";
import { Config } from "@algorandfoundation/algokit-utils";

Config.configure({ populateAppCallResources: false, debug: false, traceAll: false });

const algorand = AlgorandClient.fromEnvironment();
const deployer = await algorand.account.fromEnvironment("DEPLOYER");

const factory = algorand.client.getTypedAppFactory(AssetLabelingFactory, {
  defaultSender: deployer.addr,
});

const { appClient, result } = await factory.deploy({
  createParams: {
    extraProgramPages: 3,
  },
  onUpdate: "append",
  onSchemaBreak: "append",
});

// If app was just created fund the app account
if (["create", "replace"].includes(result.operationPerformed)) {
  await algorand.send.payment({
    amount: (0.1).algo(),
    sender: deployer.addr,
    receiver: appClient.appAddress,
  });
}

const { appId } = appClient;
const sdk = new AbelSDK({ algorand, appId, writeAccount: deployer, });

async function logAllState() {
  const labels: string[] = await sdk.getAllLabels();
  const operators: string[] = await sdk.getAllOperators();
  const assets: bigint[] = await sdk.getAllAssetIDs();

  const labelDescriptors = await sdk.getLabelDescriptors(labels);
  const operatorLabels = await Promise.all(operators.map((o) => sdk.getOperatorLabels(o)));
  const assetLabels = await sdk.getAssetsLabels(assets);

  console.dir({ labels: labelDescriptors, operators: [operators, operatorLabels], assetLabels });
}


logAllState()
