# Abel: On-Chain Asset Labeling Registry

**Impatient? Jump to [setup](#Setup).**

**Status: Alpha:**

- Registry contract is feature complete
- Registry tests are almost done
- Registry SDK is in PoC state (for tests)
- Asset views are in development

## Overview

Registry contract to provide:

1) on- and off-chain verification status ("label") for ASAs
2) supporting multiple providers & labels, and
3) bonus: enable efficiently fetching (broader) asset information (off-chain, batching via simulate)

### Objectives

**1) Create a transparent and highly available registry for asset verification labels**

Currently, the Pera Asset Verification system has prevailed in our ecosystem. Moving this on-chain will provide higher availability, convenience and transparency. It will also make verification status available to smart contracts via on-chain contract-to-contract calls.

**2) Enable & encourage new asset labeling providers**

In the interest of decentralization, it would be good to enable multiple providers instead of just Pera.

Establishing a straightforward distribution method for asset labeling should reduce the friction for other parties to start providing asset labeling services, either as a public good or for private usage.

**3) Bonus: provide methods to perform bulk asset information lookups**

The secondary utility of this contract will be offering read-only calls that can be simulated to fetch multiple assets' information at once, for use in frontends like explorers, defi, etc.

Using this method will allow fetching up to 128 assets' data at a time, resulting in significantly reduced overhead in networking/API requests etc for frontends and (web 2) backends.

As an example, rendering a simple asset transfer transaction in a table row could require just the asset decimals (in order to render the amount) and the unit name (in order to indicate the asset being transferred.) Currently, querying for these two pieces of information requires an entire asset object lookup from algod or indexer, and for tens+ of assets in a page, this can add up.

**4) Open source example**

The general concept of this registry is generalizable to other use cases. Open sourcing this contract with a permissive licence will make it useful for other types of registry deployments, and for educational purposes.

### Concepts

The core service provided is **labeling** of **assets**.

A **label** corresponds to a single label by a verification/labeling provider, e.g. "pv" for "Pera Verified", or "ps" for "Pera Suspicious".

Assets can be assigned multiple labels from different operators.

Role based access controls enforce access privileges to each label.

Roles: Admin, Operators (per label.)

- Admin has admin privileges, can create new labels, and add/remove operators to labels.
- Operators are given access to a $label:
    - add/remove the label $label to any asset
    - add/remove operators to the $label access group
- Operators can be assigned to multiple labels

_Note: The concept of a "provider" is not mapped to the contract explicitly. RBAC is applied to labels. Multiple labels under the same provider are treated separately, e.g. "Pera Verified" and "Pera Suspicious" are not linked and have separate "operators" in the RBAC system. The complexity of mapping the "provider" entity to the contract logic does not seem to be a reasonable trade-off at this time._

## Registry Design

### Global storage

```python
admin: Address
```

### Box storage

(Namespacing by box key length, no prefixes needed at this time)

#### Label Descriptors

```python
[label_id] -> Struct<label_name,num_labels,num_operators>

e.g. "pv" -> ["Pera Verified",2218,2]
```

Label ID: must be exactly 2 bytes

#### Operator <> label access

```python
[operator pk] -> granted_label_id[]

```

Operator: 32 bytes pk

#### Asset <> Labels

[asset_ID uint64] -> label_id[]

## Registry Methods

### Admin access

```python
change_admin(new_admin)
add_label(label_id, label_name, first_operator)
remove_label(label_id)
```

### Admin & Operator access

```python
add_label_to_operator(operator, label_id)
remove_label_to_operator(operator, label_id)
```

### Operator access

```python
add_label_to_asset(asset_id, label_id)
remove_label_from_asset(asset_id, label_id)
```

### Public access / read only / label scope

```python
get_label(label_id)

get_operator_labels(operator)

has_asset_label(asset_id, label_id) -> Bool
get_asset_labels(asset_id) -> label_id[]

have_assets_label(asset_ids[], label_id) -> Bool[]
get_assets_labels(asset_ids[]) -> label_id[][]
```

_Note: in methods that operate on multiple assets, inputs are mapped to outputs by offset. In `get_assets_labels`, an asset without labels should map to an empty labels array `[]` in the corresponding offset._

### Public access / read only / mixed scope

## Data fetcher design

On top of verification labels, this contract will enable efficient off-chain querying of asset data. This enables batch asset lookups that include not only label data, but also core asset data, like unit name.

### Asset Views/Structs

We define 4 asset views that will be returned (or logged) as arc4 structs.

Different use cases may opt to fetch 

#### Full (including reserve balance for circulating supply calculations)

- Asset Name - AN 32
- Unit Name - UN 8
- Total - TOT 8
- Decimal - DEC 4
- URL 96
- Manager - MGR 32
- Freeze - FRZ 32
- Clawback - CLWB 32
- Reserve - 32
- Reserve Balance - 8
- LABELS 4 (? doublecheck dynamicarray<dynamicbytes> overhead)

_Question: Should this include metadata hash and default frozen? Leaning yes._

Max assets per simulate: 64 (2 resources per asset: 1x acct, 1x asset)

Max logged: 288 x 64 = 18432 bytes

#### Large

- AN 32
- UN 8
- TOT 8
- DEC 4
- URL 96
- MGR 32
- FRZ 32
- CLWB 32
- RSVR 32
- LABELS 4

(See "full" view for acronym definitions)

max assets per simulate: 128

= 280 x 128 = 35840 max

#### Small

- AN 32
- UN 8
- TOT 8
- DEC 4
- URL 96
- FRZ_BOOL 1
- CLWB_BOOL 1
- LABELS 4

(See "full" view for acronym definitions)

max assets per simulate: 128

= 154 x 128 = 19712 max

#### Tiny

- UN 8
- DEC 8
- LABELS 4

(See "full" view for acronym definitions)

max assets per simulate: 128

= 20 x 128 = 2560 max

## View methods

Each view above would have three corresponding read methods. E.g. for the full view:

```python
get_asset_full(asset_id) -> AssetFullView
get_assets_full(asset_ids[]) -> AssetFullView[]
log_assets_full(asset_ids[]) -> void
```

The `log_` variants will log each asset view independently. This will allow for more than 4KB of data to be "returned" per simulate request.

**Note: the `get_` variants will fail if the size of the returned data (including arc4 encoding overhead) exceeds 4KB. The `log_` variants should be preferred by the SDK and other clients.**

The full list of methods (4 views x 3 methods) are:

```python
get_asset_full(asset_id) -> AssetFullView
get_assets_full(asset_ids[]) -> AssetFullView[]
log_assets_full(asset_ids[]) -> void

get_asset_large(asset_id) -> AssetLargeView
get_assets_large(asset_ids[]) -> AssetLargeView[]
log_assets_large(asset_ids[]) -> void

get_asset_small(asset_id) -> AssetSmallView
get_assets_small(asset_ids[]) -> AssetSmallView[]
log_assets_small(asset_ids[]) -> void

get_asset_tiny(asset_id) -> AssetTinyView
get_assets_tiny(asset_ids[]) -> AssetTinyView[]
log_assets_tiny(asset_ids[]) -> void
```

_Question: should the single asset getter be omitted? the plural variant could be used to fetch a single asset as well. Leaning yes._

## Setup

### Initial setup
1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then, install `AlgoKit` following this [guide](https://github.com/algorandfoundation/algokit-cli#install).
3. Run `algokit project bootstrap all` in the project directory. This command sets up your environment by installing necessary dependencies, setting up a Python virtual environment, and preparing your `.env` file.
4. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `asset_labeling-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
5. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
6. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [asset_labeling-contracts](projects/asset_labeling-contracts/README.md)
   - Frontend Application: [asset_labeling-frontend](projects/asset_labeling-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit project bootstrap all` again.
2. Follow step 3 above.

### Continuous Integration / Continuous Deployment (CI/CD)

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI/CD workflows, which are located in the [`.github/workflows`](./.github/workflows) folder. You can configure these actions to suit your project's needs, including CI checks, audits, linting, type checking, testing, and deployments to TestNet.

For pushes to `main` branch, after the above checks pass, the following deployment actions are performed:
  - The smart contract(s) are deployed to TestNet using [AlgoNode](https://algonode.io).
  - The frontend application is deployed to a provider of your choice (Netlify, Vercel, etc.). See [frontend README](frontend/README.md) for more information.

> Please note deployment of smart contracts is done via `algokit deploy` command which can be invoked both via CI as seen on this project, or locally. For more information on how to use `algokit deploy` please see [AlgoKit documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/deploy.md).

## Tools

This project makes use of Python and React to build Algorand smart contracts and to provide a base project configuration to develop frontends for your Algorand dApps and interactions with smart contracts. The following tools are in use:

- Algorand, AlgoKit, and AlgoKit Utils
- Python dependencies including Poetry, Black, Ruff or Flake8, mypy, pytest, and pip-audit
- React and related dependencies including AlgoKit Utils, Tailwind CSS, daisyUI, use-wallet, npm, jest, playwright, Prettier, ESLint, and Github Actions workflows for build validation

### VS Code

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [backend .vscode](./backend/.vscode) and [frontend .vscode](./frontend/.vscode) folders for more details.

## Integrating with smart contracts and application clients

Refer to the [asset_labeling-contracts](projects/asset_labeling-contracts/README.md) folder for overview of working with smart contracts, [projects/asset_labeling-frontend](projects/asset_labeling-frontend/README.md) for overview of the React project and the [projects/asset_labeling-frontend/contracts](projects/asset_labeling-frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](projects/asset_labeling-frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of interactions with your AssetLabelingClient in [`AppCalls.tsx`](projects/asset_labeling-frontend/src/components/AppCalls.tsx) component by default.

## Next Steps

You can take this project and customize it to build your own decentralized applications on Algorand. Make sure to understand how to use AlgoKit and how to write smart contracts for Algorand before you start.
