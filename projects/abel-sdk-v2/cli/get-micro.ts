import { writeFileSync } from "fs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK, AssetLabelingClient, AssetLabelingFactory } from "../dist";
import { Config } from "@algorandfoundation/algokit-utils";

const start = BigInt(process.argv[2])
const len = parseInt(process.argv[3], 10)

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
const sdk = new AbelSDK({ algorand, appId, writeAccount: deployer });

const assets = new Array(len).fill(0).map((_, i) => start+BigInt(i))
console.log({ assets })
console.log(await sdk.getAssetsMicro(assets));
