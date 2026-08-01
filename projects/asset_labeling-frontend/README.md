# asset_labeling-frontend

A small React app that browses the Abel registry: it reads every labeled asset ID from the contract, fetches the [AssetSmall](../abel-sdk-v2/README.md#querying-assets) view for each via [abel-sdk](../abel-sdk-v2/README.md), and renders them in a paginated table.

It is read-only — there is no wallet integration and no signing.

# Setup

### Initial Setup

#### 1. Clone the Repository
Start by cloning this repository to your local machine.

#### 2. Install Pre-requisites
Ensure the following pre-requisites are installed and properly configured:

- **npm**: Node package manager. Install from [Node.js Installation Guide](https://nodejs.org/en/download/). Verify with `npm -v` to see version `18.12`+.
- **AlgoKit CLI**: Essential for project setup and operations. Install the latest version from [AlgoKit CLI Installation Guide](https://github.com/algorandfoundation/algokit-cli#install). Verify installation with `algokit --version`, expecting `2.0.0` or later.

#### 3. Bootstrap Your Local Environment
Run the following commands within the project folder:

- **Install Project Dependencies**: With `algokit project bootstrap all`, ensure all dependencies are ready.

### Development Workflow

#### Terminal
Directly manage and interact with your project using AlgoKit commands:

1. **Build**: `algokit project run build` builds the web app.
2. Remaining commands for linting, testing and deployment can be found in the [package.json](./package.json) and [.algokit.toml](./.algokit.toml) files.

`npm run dev` starts the Vite dev server.

#### Configuration

Configuration is read from Vite environment variables. Bootstrap creates a `.env` from [`.env.template`](.env.template).

- `VITE_APP_ID` — the Abel registry app ID to read. Defaults to the Mainnet PoC app if unset.
- `VITE_ALGOD_*` — the algod the app queries.

> Please note, by default the frontend is pre-configured to run against Algorand LocalNet. If you want to run against TestNet or MainNet, comment out the current environment variable and uncomment the relevant one in the [`.env`](.env) file.

#### VS Code
For a seamless experience with breakpoint debugging and other features:

1. **Open Project**: In VS Code, open the repository root.
2. **Install Extensions**: Follow prompts to install recommended extensions.
3. **Debugging**: Use `F5` to start debugging.

#### Other IDEs
While primarily optimized for VS Code, Jetbrains WebStorm has base support for this project: open the repository root and the IDE should configure itself.

## AlgoKit Workspaces and Project Management
This project supports both standalone and monorepo setups through AlgoKit workspaces. Leverage [`algokit project run`](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) commands for efficient monorepo project orchestration and management across multiple projects within a workspace.

### Continuous Integration

This project uses [GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) to define CI workflows, which are located in the [.github/workflows](../../.github/workflows) folder.

For pull requests and pushes to `main` branch against this repository the following checks are automatically performed by GitHub Actions:

- `lint`: Lints the codebase using `ESLint`
- `test`: Runs the test suite
- `build`: Builds the codebase using `vite`

### Release

[`asset-labeling-frontend-cd.yaml`](../../.github/workflows/asset-labeling-frontend-cd.yaml) runs on pushes to `main` and builds the app. It does not publish the build anywhere — there is no hosting provider configured.

To deploy, add a publish step to that workflow along with whatever credentials your provider needs.

# Tools

This project makes use of React to provide a frontend for the Abel registry. The following tools are in use:

- [abel-sdk](../abel-sdk-v2/README.md) - The Abel SDK, used for all registry and asset data reads.
- [AlgoKit Utils](https://github.com/algorandfoundation/algokit-utils-ts) - Various TypeScript utilities to simplify interactions with Algorand and AlgoKit.
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces.
- [Vite](https://vitejs.dev/) - Build tool and dev server.
- [MUI](https://mui.com/) - React component library; the asset table uses [MUI X Data Grid](https://mui.com/x/react-data-grid/).
- [npm](https://www.npmjs.com/): Node.js package manager
- [Prettier](https://prettier.io/): Opinionated code formatter
- [ESLint](https://eslint.org/): Tool for identifying and reporting on patterns in JavaScript
- Github Actions workflows for build validation

It has also been configured to have a productive dev experience out of the box in [VS Code](https://code.visualstudio.com/), see the [.vscode](./.vscode) folder.

# Integrating with the registry

Registry access goes through [abel-sdk](../abel-sdk-v2/README.md) rather than a locally generated app client — see [`src/Assets.tsx`](./src/Assets.tsx) for a worked example.

> [!NOTE]
> This app still depends on `abel-sdk@^0.1.0`, the legacy line built against js-algorand-sdk v2 and algokit-utils v7. It resolves that from the npm registry rather than linking to the workspace copy in [`projects/abel-sdk-v2`](../abel-sdk-v2) (named `abel-v2-sdk` locally). The current SDK release is [v3.x](../abel-sdk-v3/README.md); migrating this app is outstanding.
