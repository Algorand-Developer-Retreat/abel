import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { Address, Account } from 'algosdk'
import { AssetLabelingClient, LabelDescriptor } from '../smart_contracts/artifacts/asset_labeling/AssetLabelingClient'

export async function addLabel(
  client: AssetLabelingClient,
  account: Address & TransactionSignerAccount & Account,
  labelId: string,
  labelName: string,
): Promise<string> {
  const { txIds } = await client
    .newGroup()
    .addTransaction(
      await client.algorand.createTransaction.payment({
        sender: account,
        receiver: client.appAddress,
        amount: (0.2).algos(),
      }),
    )
    .addLabel({ args: { id: labelId, name: labelName }, boxReferences: [labelId] })
    .send()
  return txIds[0]
}

export async function removeLabel(client: AssetLabelingClient, labelId: string): Promise<string> {
  const { txIds } = await client
    .newGroup()
    .removeLabel({ args: { id: labelId }, boxReferences: [labelId] })
    .send()
  return txIds[0]
}

export async function getLabelDescriptor(client: AssetLabelingClient, labelId: string): Promise<LabelDescriptor> {
  const {
    returns: [labelDescriptor],
  } = await client
    .newGroup()
    .getLabel({ args: { id: labelId }, boxReferences: [labelId] })
    .simulate()

  return labelDescriptor!
}

export async function addOperatorToLabel(
  client: AssetLabelingClient,
  operator: Account,
  label: string,
): Promise<string> {
  const { txIds } = await client.send.addOperatorToLabel({
    args: { operator: operator.addr.toString(), label },
    boxReferences: [operator.addr.publicKey, label],
  })
  return txIds[0]
}

export async function removeOperatorFromLabel(
  client: AssetLabelingClient,
  operator: Account,
  label: string,
): Promise<string> {
  const { txIds } = await client.send.removeOperatorFromLabel({
    args: { operator: operator.addr.toString(), label },
    boxReferences: [operator.addr.publicKey, label],
  })
  return txIds[0]
}

export async function getOperatorLabels(client: AssetLabelingClient, operator: Account): Promise<string[]> {
  const {
    returns: [operatorLabels],
  } = await client
    .newGroup()
    .getOperatorLabels({ args: { operator: operator.addr.toString() }, boxReferences: [operator.addr.publicKey] })
    .simulate()

  return operatorLabels!
}
