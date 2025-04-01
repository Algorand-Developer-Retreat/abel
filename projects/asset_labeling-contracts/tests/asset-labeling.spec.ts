import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { AssetLabelingFactory } from '../smart_contracts/artifacts/asset_labeling/AssetLabelingClient'
import { Account } from 'algosdk'
import { Config } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import {
  addLabel,
  addOperatorToLabel,
  getLabelDescriptor,
  getOperatorLabels,
  removeLabel,
  removeOperatorFromLabel,
} from './sdk'

// TODO:
// chamge_admin
// add_label as nonadmin (operator?) should fail
// remove_label as nonadmin (operator?) should fail
// add_op as operator
// remove_op as operator
// add_op nonexist label should fail
// remove_op nonexist label should fail

describe('asset labeling contract', () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      populateAppCallResources: true,
      debug: false,
      traceAll: false,
    })
  })
  beforeEach(localnet.newScope)

  const deploy = async (account: Account & TransactionSignerAccount) => {
    const factory = localnet.algorand.client.getTypedAppFactory(AssetLabelingFactory, {
      defaultSender: account.addr,
      defaultSigner: account.signer,
    })

    const { appClient } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })
    return { client: appClient }
  }

  test('change admin', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    const newAdmin = await localnet.context.generateAccount({ initialFunds: (0).algos() })

    await client.send.changeAdmin({ args: { newAdmin: newAdmin.addr.toString() } })
    const storedAdmin = await client.state.global.admin()

    expect(storedAdmin.asByteArray()).toEqual(newAdmin.addr.publicKey)
  })
  test('change admin should fail when not called by admin', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const rando = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    const randoClient = client.clone({
      defaultSender: rando,
      defaultSigner: rando.signer,
    })

    await expect(() => randoClient.send.changeAdmin({ args: { newAdmin: rando.addr.toString() } })).rejects.toThrow(
      /ERR:UNAUTH/,
    )
  })

  test('add label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(client, testAccount, id, name)

    const labelDescriptor = await getLabelDescriptor(client, id)

    expect(labelDescriptor?.name).toBe(name)
    expect(labelDescriptor?.numAssets).toBe(0n)
    expect(labelDescriptor?.numOperators).toBe(0n)
  })

  test('add label should fail by nonadmin', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    const rando = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    const randoClient = client.clone({
      defaultSender: rando,
      defaultSigner: rando.signer,
    })

    await expect(() => addLabel(randoClient, testAccount, id, name)).rejects.toThrow(/ERR:UNAUTH/)
  })

  test('re-add existing label should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(client, testAccount, id, name)
    await expect(() => addLabel(client, testAccount, id, name)).rejects.toThrow(/ERR:EXISTS/)
  })

  for (const id of ['w', 'www']) {
    test(`add label with invalid length (${id.length}) should fail`, async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const name = 'world'

      await expect(() => addLabel(client, testAccount, id, name)).rejects.toThrow(/ERR:LENGTH/)
    })
  }

  test('add label, remove label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(client, testAccount, id, name)

    await removeLabel(client, id)

    await expect(() => getLabelDescriptor(client, id)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('remove nonexist label should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'

    await expect(removeLabel(client, id)).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('add operator to label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(client, testAccount, id, name)

    await addOperatorToLabel(client, testAccount, id)

    const labelDescriptor = await getLabelDescriptor(client, id)

    expect(labelDescriptor?.numOperators).toBe(1n)

    const operatorLabels = await getOperatorLabels(client, testAccount)
    expect(operatorLabels).toBe([id])

    const { numOperators } = await getLabelDescriptor(client, id)
    expect(numOperators).toBe(1n)
  })

  test('add operator to label by operator', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    const operator = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })

    await addLabel(client, testAccount, id, name)

    await addOperatorToLabel(client, operator, id)

    const [operatorLabel] = await getOperatorLabels(client, operator)
    expect(operatorLabel).toBe(id)

    const operatorClient = client.clone({
      defaultSender: operator,
    })
  })

  test('add 2 labels to operator', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'
    const id2 = 'w2'

    await Promise.all([addLabel(client, testAccount, id, name), addLabel(client, testAccount, id2, name)])

    await addOperatorToLabel(client, testAccount, id)
    await addOperatorToLabel(client, testAccount, id2)

    const labelDescriptor = await getLabelDescriptor(client, id)
    expect(labelDescriptor.numOperators).toBe(1n)

    const labelDescriptor2 = await getLabelDescriptor(client, id2)
    expect(labelDescriptor2.numOperators).toBe(1n)

    const operatorLabels = await getOperatorLabels(client, testAccount)

    expect(operatorLabels[0]).toBe(id)
    expect(operatorLabels[1]).toBe(id2)
  })

  test('add operator to label twice should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await addLabel(client, testAccount, id, name)
    await addOperatorToLabel(client, testAccount, id)

    await expect(() => addOperatorToLabel(client, testAccount, id)).rejects.toThrow(/ERR:EXISTS/)
  })

  test('1x add/remove operator label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(client, testAccount, id, name)

    await addOperatorToLabel(client, testAccount, id)
    await removeOperatorFromLabel(client, testAccount, id)

    await expect(() => getOperatorLabels(client, testAccount)).rejects.toThrow(/ERR:NOEXIST/)

    const { numOperators } = await getLabelDescriptor(client, id)
    expect(numOperators).toBe(0n)
  })

  test('2x add/remove operator labels', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(client, testAccount, id, name)
    await addLabel(client, testAccount, id2, name)

    await addOperatorToLabel(client, testAccount, id)
    await addOperatorToLabel(client, testAccount, id2)
    await removeOperatorFromLabel(client, testAccount, id)

    const [operatorLabel] = await getOperatorLabels(client, testAccount)
    expect(operatorLabel).toBe(id2)

    await removeOperatorFromLabel(client, testAccount, id2)
    await expect(() => getOperatorLabels(client, testAccount)).rejects.toThrow(/ERR:NOEXIST/)

    const { numOperators } = await getLabelDescriptor(client, id)
    expect(numOperators).toBe(0n)
  })

  test('2x reverse add/remove operator labels', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(client, testAccount, id, name)
    await addLabel(client, testAccount, id2, name)

    await addOperatorToLabel(client, testAccount, id)
    await addOperatorToLabel(client, testAccount, id2)
    await removeOperatorFromLabel(client, testAccount, id2)

    const [operatorLabel] = await getOperatorLabels(client, testAccount)
    expect(operatorLabel).toBe(id)

    await removeOperatorFromLabel(client, testAccount, id)
    await expect(() => getOperatorLabels(client, testAccount)).rejects.toThrow(/ERR:NOEXIST/)

    const { numOperators } = await getLabelDescriptor(client, id)
    expect(numOperators).toBe(0n)
  })

  test('remove operator label from unauth should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const id2 = 'w2'
    const name = 'world'

    await addLabel(client, testAccount, id, name)

    await addOperatorToLabel(client, testAccount, id)

    const rando = await localnet.context.generateAccount({ initialFunds: (0.2).algos() })
    const randoClient = client.clone({
      defaultSender: rando,
      defaultSigner: rando.signer,
    })

    await expect(() => removeOperatorFromLabel(randoClient, testAccount, id)).rejects.toThrow(/ERR:UNAUTH/)
  })
})
