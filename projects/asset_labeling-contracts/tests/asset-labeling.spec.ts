import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import {
  AssetLabelingClient,
  AssetLabelingFactory,
  LabelDescriptor,
} from '../smart_contracts/artifacts/asset_labeling/AssetLabelingClient'
import { Account, Address } from 'algosdk'
import { Config } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { addLabel, addOperatorToLabel, getLabelDescriptor, getOperatorLabels, removeLabel } from './sdk'

describe('asset labeling contract', () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      populateAppCallResources: false,
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

    expect(operatorLabels[0]).toBe(id)
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
})
