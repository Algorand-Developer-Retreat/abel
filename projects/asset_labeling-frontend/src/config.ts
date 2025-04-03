import {AlgoClientConfig} from "@algorandfoundation/algokit-utils/types/network-client";
import {TokenHeader} from "algosdk";

export interface AlgoViteClientConfig extends AlgoClientConfig {
  /** Base URL of the server e.g. http://localhost, https://testnet-api.algonode.cloud/, etc. */
  server: string
  /** The port to use e.g. 4001, 443, etc. */
  port: string | number
  /** The token to use for API authentication (or undefined if none needed) - can be a string, or an object with the header key => value */
  token: string | TokenHeader
  /** String representing current Algorand Network type (testnet/mainnet and etc) */
  network: string
}

export interface AlgoViteKMDConfig extends AlgoClientConfig {
  /** Base URL of the server e.g. http://localhost, https://testnet-api.algonode.cloud/, etc. */
  server: string
  /** The port to use e.g. 4001, 443, etc. */
  port: string | number
  /** The token to use for API authentication (or undefined if none needed) - can be a string, or an object with the header key => value */
  token: string | TokenHeader
  /** KMD wallet name */
  wallet: string
  /** KMD wallet password */
  password: string
}
export function getAlgodConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!import.meta.env.VITE_ALGOD_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying VITE_ALGOD_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_ALGOD_SERVER,
    port: import.meta.env.VITE_ALGOD_PORT,
    token: import.meta.env.VITE_ALGOD_TOKEN,
    network: import.meta.env.VITE_ALGOD_NETWORK,
  }
}

export function getIndexerConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!import.meta.env.VITE_INDEXER_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying VITE_INDEXER_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_INDEXER_SERVER,
    port: import.meta.env.VITE_INDEXER_PORT,
    token: import.meta.env.VITE_INDEXER_TOKEN,
    network: import.meta.env.VITE_ALGOD_NETWORK,
  }
}

export function getKmdConfigFromViteEnvironment(): AlgoViteKMDConfig {
  if (!import.meta.env.VITE_KMD_SERVER) {
    throw new Error('Attempt to get default kmd configuration without specifying VITE_KMD_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_KMD_SERVER,
    port: import.meta.env.VITE_KMD_PORT,
    token: import.meta.env.VITE_KMD_TOKEN,
    wallet: import.meta.env.VITE_KMD_WALLET,
    password: import.meta.env.VITE_KMD_PASSWORD,
  }
}
