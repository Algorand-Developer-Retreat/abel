import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AssetLabelingFactory } from '../artifacts/asset_labeling/AssetLabelingClient'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying AssetLabeling ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(AssetLabelingFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  // const method = 'addLabel'
  // const response = await appClient.send.addLabel({
  //   args: { id: 'pv', name: 'Pera Verified' },
  // })
  // console.log(
  //   `Called ${method} on ${appClient.appClient.appName} (${appClient.appClient.appId}) with name = world, received: ${response.return}`,
  //   `https://l.algo.surf/${response.transactions[0].txID()}`,
  // )
}
