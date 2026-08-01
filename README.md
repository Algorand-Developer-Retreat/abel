# Abel: On-Chain Asset Labeling Registry

**Impatient? Jump to [setup](#setup), or the [SDK](#sdk).**

**Status: PoC/Alpha**

_Disclaimer: This is a proof of concept developed for the 2025 Algorand Developer Retreat. Not endorsed by the Algorand Foundation or Pera._

## Overview

Registry contract to provide:

1) on- and off-chain verification status ("label") for ASAs
2) supporting multiple providers & labels, and
3) bonus: enable efficiently fetching (broader) asset information (off-chain, batching via simulate)

## Objectives

**1) Create a transparent and highly available registry for asset verification labels**

Currently, the Pera Asset Verification system has prevailed in our ecosystem. Moving this on-chain will provide higher availability, convenience and transparency. It will also make verification status available to smart contracts via on-chain contract-to-contract calls.

**2) Enable & encourage new asset labeling providers**

In the interest of decentralization, it would be good to enable multiple providers instead of just Pera.

Establishing a straightforward distribution method for asset labeling should reduce the friction for other parties to start providing asset labeling services, either as a public good or for private usage.

**3) Bonus: provide methods to perform bulk asset information lookups**

The secondary utility of this contract will be offering read-only calls that can be simulated to fetch multiple assets' information at once, for use in frontends like explorers, defi, etc.

Using this method will allow fetching up to 128 assets' data at a time — depending on the [view](#asset-viewsstructs) requested — resulting in significantly reduced overhead in networking/API requests etc for frontends and (web 2) backends.

As an example, rendering a simple asset transfer transaction in a table row could require just the asset decimals (in order to render the amount) and the unit name (in order to indicate the asset being transferred.) Currently, querying for these two pieces of information requires an entire asset object lookup from algod or indexer, and for tens+ of assets in a page, this can add up.

**4) Open source example**

The general concept of this registry is generalizable to other use cases. Open sourcing this contract with a permissive licence will make it useful for other types of registry deployments, and for educational purposes.

## Concepts

The core service provided is **labeling** of **assets**.

A **label** corresponds to a single label by a verification/labeling provider, e.g. `pv` for "Pera Verified", or `ps` for "Pera Suspicious".

Assets can be assigned multiple labels from different providers/operators.

Role based access controls enforce access privileges to each label.

Roles:

- Admin
- Per-label Operators

Access:

- Admin has admin privileges, can create new labels, and add/remove operators to labels.
- Operators are given access to a $label:
    - add/remove the label $label to any asset
    - add/remove operators to the $label access group
- Operators can be assigned to multiple labels

_Note: The concept of a "provider" is not mapped to the contract explicitly. The complexity of mapping the "provider" entity to the contract logic does not seem to be a reasonable trade-off at this time. Instead, RBAC is applied to labels. Multiple labels under the same provider are treated separately, e.g. "Pera Verified" and "Pera Suspicious" are not linked and would be managed independently in the RBAC system. Each label can have multiple operators addresses, e.g. "Pera Verified" can have a primary operator account to update labels, as well as a secondary/failsafe. Within a label operator group, there no hierarchy - any label operator can remove any other label operator._

## Registry Design

### Global storage

```python
admin: Address
```

### Box storage

(Namespacing by box key length, no prefixes needed at this time)

#### Label Descriptors

```python
[label_id] -> Struct<name,url,num_assets,num_operators>

e.g. "pv" -> ["Pera Verified","https://perawallet.app",2218,2]
```

Label ID: must be exactly 2 bytes

#### Operator <> label access

```python
[operator pk] -> granted_label_id[]

```

Operator: 32 bytes pk

#### Asset <> Labels

```python
[asset_ID uint64] -> label_id[]
```

## Registry Methods

Method names and argument order match [`contract.py`](projects/asset_labeling-contracts/smart_contracts/asset_labeling/contract.py).

### Admin access

```python
change_admin(new_admin)
add_label(id, name, url)
change_label(id, name, url)
remove_label(id)
```

`add_label` creates a label with zero operators and zero assets; assign the first operator with `add_operator_to_label`.

`remove_label` requires the label to have no remaining operators and no remaining assets.

### Admin & Operator access

```python
add_operator_to_label(operator, label)
remove_operator_from_label(operator, label)
```

### Operator access

```python
add_label_to_asset(label, asset)
add_label_to_assets(label, assets[])
remove_label_from_asset(label, asset)
```

_Note: these take the label first and the asset(s) second._

### Public access / read only / label scope

```python
has_label(id) -> UInt64
get_label(id) -> LabelDescriptor
log_labels(ids[]) -> void

has_operator_label(operator, label) -> UInt64
get_operator_labels(operator) -> label_id[]

has_asset_label(asset_id, label) -> UInt64
get_asset_labels(asset) -> label_id[]
get_assets_labels(assets[]) -> label_id[][]
log_assets_labels(assets[]) -> void
```

_Note: the `has_` methods return `UInt64` (0 or 1) rather than `Bool`._

_Note: in methods that operate on multiple assets, inputs are mapped to outputs by offset. In `get_assets_labels`, an asset without labels maps to an empty labels array `[]` in the corresponding offset._

_Note: `log_labels` and `log_assets_labels` log each result independently instead of returning them, which avoids the 4KB limit on returned data. See [View methods](#view-methods)._

## Data fetcher design

On top of verification labels, this contract will enable efficient off-chain querying of asset data.

Abel provides readonly ABI methods as a simulate target to enable batch asset lookups that include not only label data, but also core asset data, like unit name.

### Asset Views/Structs

Eight asset views are returned (or logged) as arc4 structs. Field lists match [`types.py`](projects/asset_labeling-contracts/smart_contracts/asset_labeling/types.py).

Different use cases may opt to fetch different views. The number of assets that fit in a single simulate request depends on how many AVM resource references the view needs: one per asset, plus one for the asset's labels box, plus one for the reserve account.

Views come in pairs — a base view, and the same view plus labels. Fetching labels costs an extra resource reference, halving the assets per request, so use the label-free view when you only need asset data.

#### Micro (1 ref, max 128 assets)

The MVP view, e.g. for rendering an asset transfer row: enough to format an amount.

- unit_name
- decimals

#### MicroLabels (2 refs, max 64 assets)

Micro, plus labels.

- unit_name
- decimals
- labels

#### Tiny (1 ref, max 128 assets)

Micro, plus the asset name.

- name
- unit_name
- decimals

#### TinyLabels (2 refs, max 64 assets)

Tiny, plus labels.

- name
- unit_name
- decimals
- labels

#### Text (1 ref, max 128 assets)

The searchable text fields, e.g. for building a client-side asset search index.

- name
- unit_name
- url

#### TextLabels (2 refs, max 64 assets)

Text, plus labels.

- name
- unit_name
- url
- labels

#### Small (2 refs, max 64 assets)

What a hover card on an explorer may show. Freeze and clawback are reduced to booleans indicating whether the address is set.

- name
- unit_name
- decimals
- total
- has_freeze
- has_clawback
- labels

#### Full (3 refs, max 42 assets)

Everything from the algod `/v2/assets` API, plus the reserve balance for circulating supply calculations. The third resource reference is the reserve account.

- name
- unit_name
- url
- total
- decimals
- creator
- manager
- freeze
- clawback
- reserve
- default_frozen
- metadata_hash
- reserve_balance
- labels

## View methods

Each view has two corresponding read-only methods. E.g. for the micro view:

```python
get_asset_micro(asset) -> AssetMicro
get_assets_micro(assets[]) -> void
```

The singular `get_asset_*` variant returns the struct directly, for a single asset.

The plural `get_assets_*` variant logs each asset view independently and returns nothing. This allows for more than 4KB of data to be "returned" per simulate request, since the 4KB limit applies to returned data rather than logs.

**Note: the plural `get_assets_*` variants should be preferred by the SDK and other clients.** This is what the [SDK](#sdk) uses.

The full list of methods (8 views x 2 methods) are:

```python
get_asset_micro(asset) -> AssetMicro
get_assets_micro(assets[]) -> void

get_asset_micro_labels(asset) -> AssetMicroLabels
get_assets_micro_labels(assets[]) -> void

get_asset_tiny(asset) -> AssetTiny
get_assets_tiny(assets[]) -> void

get_asset_tiny_labels(asset) -> AssetTinyLabels
get_assets_tiny_labels(assets[]) -> void

get_asset_text(asset) -> AssetText
get_assets_text(assets[]) -> void

get_asset_text_labels(asset) -> AssetTextLabels
get_assets_text_labels(assets[]) -> void

get_asset_small(asset) -> AssetSmall
get_assets_small(assets[]) -> void

get_asset_full(asset) -> AssetFull
get_assets_full(assets[]) -> void
```

## SDK

[abel-sdk](projects/abel-sdk-v3/README.md) is a TypeScript SDK wrapping the registry, including batched asset lookups via simulate.

```
npm i abel-sdk
```

Docs site: [abel-docs.d13.co](https://abel-docs.d13.co)

`abel-sdk` v3.x is the current release, targeting js-algorand-sdk v3 and algokit-utils v9. For js-algorand-sdk v2 and algokit-utils v7, use the v0.x releases, maintained in [abel-sdk-v2](projects/abel-sdk-v2/README.md).

To explore the registry from a terminal, see [abel-cli](projects/abel-cli/README.md).

## Setup

### Initial setup
1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then install [AlgoKit](https://github.com/algorandfoundation/algokit-cli#install) and [pnpm](https://pnpm.io/installation).
3. Run `pnpm install` in the repository root. This is a [pnpm workspace](#workspace-layout) — one install at the root covers every JavaScript/TypeScript project under `projects/`.
4. Run `algokit project bootstrap all` to set up the Python virtual environment for the contracts and prepare `.env` files.
5. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `asset_labeling-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
6. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
7. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [asset_labeling-contracts](projects/asset_labeling-contracts/README.md)
   - TypeScript SDK, current: [abel-sdk-v3](projects/abel-sdk-v3/README.md) — js-algorand-sdk v3, algokit-utils v9
   - TypeScript SDK, legacy: [abel-sdk-v2](projects/abel-sdk-v2/README.md) — js-algorand-sdk v2, algokit-utils v7
   - CLI: [abel-cli](projects/abel-cli/README.md)
   - Frontend Application: [asset_labeling-frontend](projects/asset_labeling-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Workspace layout

The JavaScript/TypeScript projects form a single [pnpm workspace](https://pnpm.io/workspaces), declared in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) as `projects/*`. There is one lockfile, [`pnpm-lock.yaml`](./pnpm-lock.yaml), at the root; the individual projects do not have their own.

| Directory | Package name | Notes |
| --- | --- | --- |
| `projects/abel-sdk-v3` | `abel-sdk` | Current SDK, published to npm |
| `projects/abel-sdk-v2` | `abel-v2-sdk` | Legacy SDK, published to npm as `abel-sdk` v0.x |
| `projects/abel-cli` | `abel-cli` | Consumes `abel-sdk` via `workspace:*` |
| `projects/asset_labeling-contracts` | `smart_contracts` | Contract build and tests |
| `projects/asset_labeling-frontend` | `asset_labeling-frontend` | React app |

The two SDKs are published under the same npm name (`abel-sdk`) but on different major lines, so the legacy package is named `abel-v2-sdk` locally to keep the workspace names unique. See the [abel-sdk-v2 README](projects/abel-sdk-v2/README.md) for what this means when installing it.

Run a script in one project with `--filter`, from anywhere in the repo:

```
pnpm --filter abel-sdk build          # build the current SDK
pnpm --filter abel-cli exec tsc --noEmit
pnpm --filter asset_labeling-frontend dev
```

Because `abel-cli` depends on `abel-sdk` with `workspace:*`, it always resolves the local SDK and shares a single copy of `algosdk` with it. That sharing matters: js-algorand-sdk v3 uses `instanceof Address` checks, which fail if a consumer and the SDK each resolve their own copy of `algosdk`.

_Note: `algokit project run build` builds the contracts and frontend. Build the SDKs with `pnpm --filter abel-sdk build`; that build regenerates the contract client from the compiled contract artifacts._

### Subsequently

1. If you update to the latest source code and there are new dependencies, run `pnpm install` in the repository root again.
2. If Python dependencies changed, run `algokit project bootstrap all` again.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:
  - The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
  - The frontend application is built. It is not published anywhere — no hosting provider is configured. See [frontend README](projects/asset_labeling-frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

The registry contract is written in Algorand Python; the SDKs, CLI and frontend are TypeScript. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Contracts: Algorand Python (PuyaPy), with Poetry, Black, Ruff, mypy and pip-audit
- SDKs and CLI: TypeScript, tsx, typedoc, and the AlgoKit client generator
- Frontend: React, Vite, and MUI
- GitHub Actions workflows for build validation

### VS Code

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [.vscode](./.vscode) folder and the [contracts .vscode](projects/asset_labeling-contracts/.vscode) folder for more details.

## Integrating with smart contracts and application clients

The easiest way to integrate with the registry is the [SDK](#sdk), which wraps the generated contract client and handles simulate batching for you.

If you need the generated ARC-4 client directly, it is published as a subpath export of the SDK package:

```typescript
import { AssetLabelingClient } from "abel-sdk/client";
```

The client is generated from the compiled contract artifacts by the SDK's build script, so it stays in sync with [`contract.py`](projects/asset_labeling-contracts/smart_contracts/asset_labeling/contract.py). Refer to the [asset_labeling-contracts](projects/asset_labeling-contracts/README.md) README for an overview of working with the contract itself.

[asset_labeling-frontend](projects/asset_labeling-frontend/README.md) is a small React app that consumes the SDK, and serves as a worked example.

## Next Steps

You can take this project and customize it to build your own decentralized applications on Algorand. Make sure to understand how to use AlgoKit and how to write smart contracts for Algorand before you start.
