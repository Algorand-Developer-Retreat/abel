# Abel CLI

A thin CLI over [abel-sdk](../abel-sdk-v3/README.md), for reading from and operating on the Abel asset labeling registry.

## Setup

### Install dependencies

This project is part of the repository's [pnpm workspace](../../README.md#workspace-layout), so install from the repository root:

```
pnpm install
```

### Build the SDK

The CLI depends on the sibling [abel-sdk-v3](../abel-sdk-v3) via `workspace:*`, so it always resolves the local SDK. Build it before first use, and after any SDK change:

```
pnpm --filter abel-sdk build
```

> [!NOTE]
> The workspace link is what keeps the CLI and the SDK on a single copy of `algosdk`. If the two ever resolve separate copies, js-algorand-sdk v3's `instanceof Address` checks fail at runtime with a misleading `Not an address` error on a perfectly valid address.

### Set up environment (optional)

Change your environment if needed.

The default `.env` points to mainnet with a read-only client. `.env.example` documents the available variables.

Check `.env.local` for a configuration with a custom algod and a mnemonic for a write client.

Use the `ENV` env var to point at a different config — the following reads `.env.local`:

```
ENV=local tsx src/get-micro.ts {asset-id}
```

## Usage

Every script takes its arguments positionally and prints to stdout; progress and diagnostics go to stderr.

### Reading asset views

Each script maps to one SDK view method and accepts any number of asset IDs:

```
tsx src/get-micro.ts 312769 6547014
tsx src/get-microlabels.ts 312769 6547014
tsx src/get-tiny.ts 312769
tsx src/get-tinylabels.ts 312769
tsx src/get-text.ts 312769
tsx src/get-textlabels.ts 312769
tsx src/get-small.ts 312769
tsx src/get-full.ts 312769
```

For example:

```
$ tsx src/get-microlabels.ts 312769 6547014
[{"id":"312769n","unitName":"USDt","decimals":6,"labels":["pv"]},{"id":"6547014n","unitName":"MCAU","decimals":5,"labels":["pv"]}]
```

### Reading the registry

```
tsx src/get-labels.ts {asset-id}...    # the labels on each given asset
tsx src/has-label.ts {asset-id} {label-id}
tsx src/get-meta-state.ts              # all label descriptors, operators and total asset count
tsx src/get-all-assets.ts              # every labeled asset ID
tsx src/get-all-assets-micro.ts        # every labeled asset, micro view
```

### Writing

These require a `MNEMONIC` in your environment for an account with the relevant privileges.

Label operators:

```
tsx src/add-asset-label.ts {asset-id} {label-id}
tsx src/remove-asset-label.ts {asset-id} {label-id}
tsx src/add-operator-label.ts {address} {label-id}
tsx src/remove-operator-label.ts {address} {label-id}
```

Admin only:

```
tsx src/add-label.ts {label-id} {name} {url}
tsx src/change-label.ts {label-id} {name} {url}
tsx src/remove-label.ts {label-id}
```

Label IDs are exactly 2 bytes.
