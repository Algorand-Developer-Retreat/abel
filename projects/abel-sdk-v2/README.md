# Abel SDK for js-algorand-sdk v2

**Abel is an Asset Labeling registry, as well as a provider of batch asset data.**

The main asset label served is "Pera Verified".

Docs site: [abel-docs.d13.co](https://abel-docs.d13.co) (documents the current v3.x release)

## Install

> [!WARNING]
> This is the legacy release line. It only supports js-algorand-sdk v2 and its corresponding algokit-utils v7.
>
> Published releases of this line are on npm as `abel-sdk` v0.x. Because that name is shared with the current release, you **must** pin the major version — a bare `npm i abel-sdk` installs v3.x, which requires js-algorand-sdk v3.

```
npm i "abel-sdk@^0.1"
```

If you are on js-algorand-sdk v3 and algokit-utils v9, use the current release instead — see [abel-sdk-v3](../abel-sdk-v3/README.md).

> [!NOTE]
> Inside this repository the package is named `abel-v2-sdk`, so that both SDK lines can coexist as [pnpm workspace](../../README.md#workspace-layout) packages — workspace package names must be unique. `abel-v2-sdk` is not published to npm; install from the registry with `abel-sdk@^0.1` as above.

`algosdk`, `@algorandfoundation/algokit-utils` and `p-map` are peer dependencies, so install them alongside abel-sdk if you don't have them already.

## Usage

> [!NOTE]
> Want to explore with a CLI? Check out [abel-cli](https://github.com/Algorand-Developer-Retreat/abel/tree/main/projects/abel-cli) which uses this SDK under the hood. Note that abel-cli tracks the v3 SDK.

The default use case is with a read-only client. This will allow you to fetch asset and label data, but not operate on the registry.

Create an SDK instance by passing in the abel app ID and an `algokit.AlgorandClient`.

For Mainnet:

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK } from "abel-sdk";

const abel = new AbelSDK({
  appId: 2914159523n, // Abel Mainnet PoC App ID
  algorand: AlgorandClient.fromConfig({
    algodConfig: { server: "https://mainnet-api.4160.nodely.dev", port: 443 },
  }),
});
```

## Querying assets

You can query assets with multiple size views.

To get the "Asset Micro Labels" view for multiple assets:

```typescript
const microData = await abel.getAssetsMicroLabels([312769n, 6547014n, 6587142n, 27165954n]);
// returns
// Map(4) {
//   312769n => { id: 312769n, unitName: 'USDt', decimals: 6, labels: [ 'pv' ] },
//   6547014n => { id: 6547014n, unitName: 'MCAU', decimals: 5, labels: [ 'pv' ] },
//   6587142n => { id: 6587142n, unitName: 'MCAG', decimals: 5, labels: [ 'pv' ] },
//   27165954n => { id: 27165954n, unitName: 'Planets', decimals: 6, labels: [ 'pv' ] }
// }
```

Asset IDs are `bigint`, as is the `id` field of every returned view. `decimals` is a `number`.

The available asset views are:

- AssetMicro (no labels)
- AssetMicroLabels
- AssetTiny (no labels)
- AssetTinyLabels
- AssetText (no labels)
- AssetTextLabels
- AssetSmall
- AssetFull

To fetch asset data in these views, use the corresponding `getAssetsXYZ` method of the SDK, e.g. `getAssetsMicroLabels`.

You can pass in as many asset IDs as you want.

## Performance

Under the hood, Abel uses simulate to fetch multiple assets' data from a single simulate call.

The number of assets per simulate request depends on how many AVM resources are required to compose it.

You will get the best performance and efficiency if you use the smallest possible view for your needs.

### 128 assets per simulate call

- AssetMicro
- AssetTiny
- AssetText

### 64 assets per simulate call

- AssetMicroLabels
- AssetTinyLabels
- AssetTextLabels
- AssetSmall

### 42 assets per simulate call

- AssetFull

### Concurrency

The Abel SDK supports arbitrarily large asset lookups.

If you request more assets than a single simulate call can provide for that view, parallel simulate requests will be made in order to fetch your data.

By default, Abel will use up to 4 simulate "threads", i.e. it will keep up to 4 simulate requests in parallel in order to fetch asset data.

You can control this level of concurrency by passing in a `concurrency` property in the Abel SDK constructor.

> [!NOTE]
> The concurrency limit is per-method call, not global. For example, if you have `concurrency: 2` and you await two separate `getAssetsTiny()` methods of more than 128 assets each, there will be 4 simulate requests in flight.

## Admin or Operator Usage

To instantiate the SDK with write capabilities, pass in your privileged account as `writeAccount`:

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK } from "abel-sdk";

const algorand = AlgorandClient.fromConfig({
  algodConfig: { server: "https://mainnet-api.4160.nodely.dev", port: 443 },
});

const mnemonic = "apple apple ...";
const writeAccount = algorand.account.fromMnemonic(mnemonic);

const abel = new AbelSDK({
  appId: 2914159523n, // Abel Mainnet PoC App ID
  algorand,
  writeAccount,
});
```

You can then operate on your label group, as well as any asset:

```typescript
const someAddress = "DTHIRTEENNLSYGLSEXTXC6X4SVDWMFRCPAOAUCXWIXJRCVBWIIGLYARNQE";
const labelId = "13"
// add another operator to your label
await abel.addOperatorToLabel(someAddress, labelId);

// remove operator from your label
await abel.removeOperatorFromLabel(someAddress, labelId);

// add label to asset with ID 1013
await abel.addLabelToAsset(1013n, labelId);

// add label to many assets, chunked and batched for you
await abel.addLabelToAssets([1013n, 1014n], labelId);

// remove label from asset with ID 1013
await abel.removeLabelFromAsset(1013n, labelId);
```

Label IDs are exactly 2 bytes.

Admin accounts can additionally manage labels themselves:

```typescript
await abel.addLabel(labelId, "Label name", "https://example.com");
await abel.changeLabel(labelId, "New name", "https://example.com");
await abel.removeLabel(labelId); // must have no operators and no assets
```

## Generated contract client

If you need the generated ARC-4 client directly, rather than going through the SDK, it is re-exported:

```typescript
import { AssetLabelingClient } from "abel-sdk";
```

It is also available on its own subpath, if you want the client without pulling in the SDK:

```typescript
import { AssetLabelingClient } from "abel-sdk/client";
```

This release also re-exports `AssetLabelingFactory`. Note that v3.x does not — if you rely on the factory, construct it from the generated client module directly when migrating.
