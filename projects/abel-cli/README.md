# Abel CLI

## Setup

### Build sdk

Build the SDK in the sibling folder. This CLI uses it directly.

### Install dependenies

```
npm i
```

### Set up environment (optional)

Change your environment if needed.

The default `.env` points to mainnet with a read-only client.

Check `.env.local` to see a configuration with custom algod & a mnemonic for a write client.

Use the `ENV` env var to point to a different config. The following will use `.env.local.

```
ENV=local tsx src/get-micro.ts {asset-id}
```


