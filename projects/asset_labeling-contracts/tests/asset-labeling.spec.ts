import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { AssetLabelingFactory } from '../smart_contracts/artifacts/asset_labeling/AssetLabelingClient'
import { Account, Algodv2, Indexer } from 'algosdk'
import { Config } from '@algorandfoundation/algokit-utils'
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'

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

    await client
      .newGroup()
      .addTransaction(
        await client.algorand.createTransaction.payment({
          sender: testAccount,
          receiver: client.appAddress,
          amount: (0.2).algos(),
        }),
      )
      .addLabel({ args: { id, name }, boxReferences: [id] })
      .send()

    const {
      returns: [labelDescriptor],
    } = await client
      .newGroup()
      .getLabel({ args: { id }, boxReferences: [id] })
      .simulate()

    console.log({ labelDescriptor })

    expect(labelDescriptor?.name).toBe(name)
    expect(labelDescriptor?.numAssets).toBe(0n)
  })

  test('re-add existing label should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    const result = await client
      .newGroup()
      .addTransaction(
        await client.algorand.createTransaction.payment({
          sender: testAccount,
          receiver: client.appAddress,
          amount: (0.2).algos(),
        }),
      )
      .addLabel({ args: { id, name }, boxReferences: [id] })
      .send()

    await expect(async () =>
      client
        .newGroup()
        .addTransaction(
          await client.algorand.createTransaction.payment({
            sender: testAccount,
            receiver: client.appAddress,
            amount: (0.2).algos(),
          }),
        )
        .addLabel({ args: { id, name }, boxReferences: [id] })
        .send(),
    ).rejects.toThrow(/ERR:EXISTS/)
  })

  for (const id of ['w', 'www']) {
    test(`add label with invalid length (${id.length}) should fail`, async () => {
      const { testAccount } = localnet.context
      const { client } = await deploy(testAccount)

      const name = 'world'

      await expect(async () =>
        client
          .newGroup()
          .addTransaction(
            await client.algorand.createTransaction.payment({
              sender: testAccount,
              receiver: client.appAddress,
              amount: (0.2).algos(),
            }),
          )
          .addLabel({ args: { id, name }, boxReferences: [id] })
          .send(),
      ).rejects.toThrow(/ERR:LENGTH/)
    })
  }

  test('add label, remove label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await client
      .newGroup()
      .addTransaction(
        await client.algorand.createTransaction.payment({
          sender: testAccount,
          receiver: client.appAddress,
          amount: (0.2).algos(),
        }),
      )
      .addLabel({ args: { id, name }, boxReferences: [id] })
      .send()

    await client
      .newGroup()
      .removeLabel({ args: { id }, boxReferences: [id] })
      .send()

    await expect(async () =>
      client
        .newGroup()
        .getLabel({ args: { id }, boxReferences: [id] })
        .simulate(),
    ).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('remove nonexist label should fail', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'

    await expect(async () =>
      client
        .newGroup()
        .removeLabel({ args: { id }, boxReferences: [id] })
        .send(),
    ).rejects.toThrow(/ERR:NOEXIST/)
  })

  test('add operator to label', async () => {
    const { testAccount } = localnet.context
    const { client } = await deploy(testAccount)

    const id = 'wo'
    const name = 'world'

    await client
      .newGroup()
      .addTransaction(
        await client.algorand.createTransaction.payment({
          sender: testAccount,
          receiver: client.appAddress,
          amount: (0.2).algos(),
        }),
      )
      .addLabel({ args: { id, name }, boxReferences: [id] })
      .send()

    await client.send.addOperatorToLabel({
      args: { operator: testAccount.addr.toString(), label: id },
      boxReferences: [testAccount.addr.publicKey, id],
    })
  })
})
