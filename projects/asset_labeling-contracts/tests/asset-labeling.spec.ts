import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import {
  AssetLabelingClient,
  AssetLabelingFactory,
} from '../smart_contracts/artifacts/asset_labeling/AssetLabelingClient'
import { Account, Address, appendSignMultisigTransaction } from 'algosdk'
import { Config } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import {
  addLabelToAsset,
  addLabel,
  addOperatorToLabel,
  getAssetLabels,
  getLabelDescriptor,
  getOperatorLabels,
  removeLabel,
  removeOperatorFromLabel,
  removeLabelFromAsset,
} from './sdk'

// TODO:
// add_label as nonadmin (operator?) should fail
// remove_label as nonadmin (operator?) should fail
// add_op as operator
// remove_op as operator
// add_op nonexist label should fail
// remove_op nonexist label should fail

const config = {
  populateAppCallResources: true,
  debug: false,
  traceAll: false,
}

describe('asset labeling contract', () => {
  const localnet = algorandFixture()

  beforeAll(() => {
    Config.configure(config)
  })
  beforeEach(localnet.newScope)

  const deploy = async (account: Account & TransactionSignerAccount) => {
    const factory = localnet.algorand.client.getTypedAppFactory(AssetLabelingFactory, {
      defaultSender: account.addr,
      defaultSigner: account.signer,
    })

    const { appClient } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })
    return { adminClient: appClient }
  }

  describe('change admin', () => {
    let adminClient: AssetLabelingClient
    let randoClient: AssetLabelingClient
    let adminAccount: Address & Account & TransactionSignerAccount
    let randoAccount: Address & Account & TransactionSignerAccount

    beforeAll(async () => {
      await localnet.newScope()

      adminAccount = localnet.context.testAccount
      adminClient = (await deploy(adminAccount)).adminClient

      randoAccount = await localnet.context.generateAccount({ initialFunds: (1).algos() })
      randoClient = adminClient.clone({
        defaultSender: randoAccount,
        defaultSigner: randoAccount.signer,
      })
    })

    test('should work', async () => {
      await adminClient.send.changeAdmin({ args: { newAdmin: randoAccount.addr.toString() } })
      const storedAdmin = await adminClient.state.global.admin()
      expect(storedAdmin.asByteArray()).toEqual(randoAccount.addr.publicKey)

      await randoClient.send.changeAdmin({ args: { newAdmin: adminAccount.addr.toString() } })
      const revertedAdmin = await adminClient.state.global.admin()
      expect(revertedAdmin.asByteArray()).toEqual(adminAccount.addr.publicKey)
    })

    test('change admin should fail when not called by admin', async () => {
      await expect(() =>
        randoClient.send.changeAdmin({ args: { newAdmin: randoAccount.addr.toString() } }),
      ).rejects.toThrow(/ERR:UNAUTH/)

      await adminClient.send.changeAdmin({ args: { newAdmin: randoAccount.addr.toString() } })

      await expect(() =>
        adminClient.send.changeAdmin({ args: { newAdmin: randoAccount.addr.toString() } }),
      ).rejects.toThrow(/ERR:UNAUTH/)
    })
  })

  test('add label', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)

    const labelDescriptor = await getLabelDescriptor(adminClient, id)

    expect(labelDescriptor?.name).toBe(name)
    expect(labelDescriptor?.numAssets).toBe(0n)
    expect(labelDescriptor?.numOperators).toBe(0n)
  })

  test('add label should fail by nonadmin', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    const rando = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    const randoClient = adminClient.clone({
      defaultSender: rando,
      defaultSigner: rando.signer,
    })

    await expect(() => addLabel(randoClient, adminAccount, id, name)).rejects.toThrow(/ERR:UNAUTH/)
  })

  test('re-add existing label should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)
    await expect(() => addLabel(adminClient, adminAccount, id, name)).rejects.toThrow(/ERR:EXISTS/)
  })

  for (const id of ['w', 'www']) {
    test(`add label with invalid length (${id.length}) should fail`, async () => {
      const { testAccount: adminAccount } = localnet.context
      const { adminClient } = await deploy(adminAccount)

      const name = 'world'

      await expect(() => addLabel(adminClient, adminAccount, id, name)).rejects.toThrow(/ERR:LENGTH/)
    })
  }

  test('add label, remove label', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)

    await removeLabel(adminClient, id)

    await expect(() => getLabelDescriptor(adminClient, id)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('remove nonexist label should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'

    await expect(removeLabel(adminClient, id)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('add operator to label', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)

    await addOperatorToLabel(adminClient, adminAccount, id)

    const labelDescriptor = await getLabelDescriptor(adminClient, id)

    expect(labelDescriptor?.numOperators).toBe(1n)

    const operatorLabels = await getOperatorLabels(adminClient, adminAccount)
    expect(operatorLabels).toStrictEqual([id])

    const { numOperators } = await getLabelDescriptor(adminClient, id)
    expect(numOperators).toBe(1n)
  })

  test('add operator to label by operator', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })

    await addLabel(adminClient, adminAccount, id, name)

    await addOperatorToLabel(adminClient, operator, id)

    const [operatorLabel] = await getOperatorLabels(adminClient, operator)
    expect(operatorLabel).toBe(id)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })

    const operator2 = await localnet.context.generateAccount({ initialFunds: (0).algos() })
    await addOperatorToLabel(operatorClient, operator2, id)
  })

  test('add 2 labels to operator', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'
    const id2 = 'w2'

    await Promise.all([addLabel(adminClient, adminAccount, id, name), addLabel(adminClient, adminAccount, id2, name)])

    await addOperatorToLabel(adminClient, adminAccount, id)
    await addOperatorToLabel(adminClient, adminAccount, id2)

    const labelDescriptor = await getLabelDescriptor(adminClient, id)
    expect(labelDescriptor.numOperators).toBe(1n)

    const labelDescriptor2 = await getLabelDescriptor(adminClient, id2)
    expect(labelDescriptor2.numOperators).toBe(1n)

    const operatorLabels = await getOperatorLabels(adminClient, adminAccount)

    expect(operatorLabels).toStrictEqual([id, id2])
  })

  test('add operator to label twice should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)
    await addOperatorToLabel(adminClient, adminAccount, id)

    await expect(() => addOperatorToLabel(adminClient, adminAccount, id)).rejects.toThrow(/ERR:EXISTS/)
  })

  test('1x add/remove operator label', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)

    await addOperatorToLabel(adminClient, adminAccount, id)
    await removeOperatorFromLabel(adminClient, adminAccount, id)

    const emptyLabels = await getOperatorLabels(adminClient, adminAccount)
    expect(emptyLabels).toEqual([])

    const { numOperators } = await getLabelDescriptor(adminClient, id)
    expect(numOperators).toBe(0n)
  })

  test('2x add/remove operator labels', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)
    await addLabel(adminClient, adminAccount, id2, name)

    await addOperatorToLabel(adminClient, adminAccount, id)
    await addOperatorToLabel(adminClient, adminAccount, id2)
    await removeOperatorFromLabel(adminClient, adminAccount, id)

    const [operatorLabel] = await getOperatorLabels(adminClient, adminAccount)
    expect(operatorLabel).toBe(id2)

    await removeOperatorFromLabel(adminClient, adminAccount, id2)

    const { numOperators } = await getLabelDescriptor(adminClient, id)
    expect(numOperators).toBe(0n)
  })

  test('2x reverse add/remove operator labels', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)
    await addLabel(adminClient, adminAccount, id2, name)

    await addOperatorToLabel(adminClient, adminAccount, id)
    await addOperatorToLabel(adminClient, adminAccount, id2)
    await removeOperatorFromLabel(adminClient, adminAccount, id2)

    const [operatorLabel] = await getOperatorLabels(adminClient, adminAccount)
    expect(operatorLabel).toBe(id)

    await removeOperatorFromLabel(adminClient, adminAccount, id)

    const { numOperators } = await getLabelDescriptor(adminClient, id)
    expect(numOperators).toBe(0n)
  })

  test('remove operator label from unauth should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(adminClient, adminAccount, id, name)

    await addOperatorToLabel(adminClient, adminAccount, id)

    const rando = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    const randoClient = adminClient.clone({
      defaultSender: rando,
      defaultSigner: rando.signer,
    })

    await expect(() => removeOperatorFromLabel(randoClient, adminAccount, id)).rejects.toThrow(/ERR:UNAUTH/)
  })

  test('add label to asset', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })

    await addLabelToAsset(operatorClient, assetId, label)

    const labelDescriptor = await getLabelDescriptor(operatorClient, label)
    expect(labelDescriptor.numAssets).toBe(1n)

    const assetLabels = await getAssetLabels(operatorClient, assetId)
    expect(assetLabels).toStrictEqual([label])
  })

  test('add label twice should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })

    await addLabelToAsset(operatorClient, assetId, label)
    await expect(() => addLabelToAsset(operatorClient, assetId, label)).rejects.toThrow(/ERR:EXIS/)
  })

  test('add non-existent label should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })

    const nonLabel = 'oh'
    await expect(() => addLabelToAsset(adminClient, assetId, nonLabel)).rejects.toThrow(/ERR:NOEXIST/)
    await expect(() => addLabelToAsset(operatorClient, assetId, nonLabel)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('add label by non-operator should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    await expect(() => addLabelToAsset(adminClient, assetId, label)).rejects.toThrow(/ERR:UNAUTH/)
  })

  test('remove label from asset', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)
    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })
    await addLabelToAsset(operatorClient, assetId, label)
    await removeLabelFromAsset(operatorClient, assetId, label)

    const labelDescriptor = await getLabelDescriptor(operatorClient, label)
    expect(labelDescriptor.numAssets).toBe(0n)

    const emptyLabels = await getAssetLabels(operatorClient, assetId)
    expect(emptyLabels).toEqual([])
  })

  test('remove non-existent label should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })

    const nonLabel = 'oh'
    await expect(() => removeLabelFromAsset(adminClient, assetId, nonLabel)).rejects.toThrow(/ERR:NOEXIST/)
    await expect(() => removeLabelFromAsset(operatorClient, assetId, nonLabel)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('remove label by non-operator should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label = 'wo'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label, labelName)
    await addOperatorToLabel(adminClient, operator, label)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })
    await addLabelToAsset(operatorClient, assetId, label)

    await expect(() => removeLabelFromAsset(adminClient, assetId, label)).rejects.toThrow(/ERR:UNAUTH/)
  })

  test('remove missing label from asset should fail', async () => {
    const { testAccount: adminAccount } = localnet.context
    const { adminClient } = await deploy(adminAccount)

    const label1 = 'wo'
    const label2 = 'wi'
    const labelName = 'world'
    const assetId = 13n

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    await addLabel(adminClient, adminAccount, label1, labelName)
    await addLabel(adminClient, adminAccount, label2, labelName)
    await addOperatorToLabel(adminClient, operator, label1)
    await addOperatorToLabel(adminClient, operator, label2)

    const operatorClient = adminClient.clone({
      defaultSender: operator,
      defaultSigner: operator.signer,
    })
    await addLabelToAsset(operatorClient, assetId, label1)

    await expect(() => removeLabelFromAsset(operatorClient, assetId, label2)).rejects.toThrow(/ERR:NOEXIST/)
  })
})
