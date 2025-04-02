import { writeFileSync } from "fs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK, AssetLabelingClient, AssetLabelingFactory } from "../dist";
import { Config } from "@algorandfoundation/algokit-utils";
import { TransactionComposer } from "@algorandfoundation/algokit-utils/types/composer";

const algorand = AlgorandClient.fromEnvironment();
const deployer = await algorand.account.fromEnvironment("DEPLOYER");

const { "last-round": lr } = await algorand.client.algod.status().do();
let {
  block: { tc },
} = await algorand.client.algod.block(lr).do();

function addAsset(composer: TransactionComposer, times) {
  for (let i = 1; i <= times; i++) {
    composer = composer.addAssetCreate({
      assetName: `AN1${tc + i}`,
      unitName: `UN${tc + i}`,
      url: `URL${tc + i}`,
      total: 1234567890n,
      decimals: 10,
      sender: deployer.addr,
    });
  }
  tc += times;
  return composer;
}

const num = Math.ceil(parseInt(process.argv[2] ?? "256", 10) / 16);

for(let i=0; i<num; i++) {
  let composer = algorand.newGroup();
  addAsset(composer, 16);
  const { txIds, confirmations: c } = await composer.send();
  console.log(c[c.length - 1].assetIndex);
}
