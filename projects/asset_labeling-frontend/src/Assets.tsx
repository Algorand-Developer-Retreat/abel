import React, { useEffect, useState } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AbelSDK } from 'abel-sdk'
import { getAlgodConfigFromViteEnvironment } from './config'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { AssetSmall } from 'abel-sdk/dist/generated/abel-contract-client'

const DEFAULT_APP_ID = 2888048711n
const PAGE_SIZE = 100

type IdProps = {
  id: bigint | null // The App ID for the AbelSDK
}

const AssetImage: React.FC<IdProps & { className?: string }> = ({ id: assetId, className }) => {
  if (!assetId) return null
  const logo = `https://asa-list.tinyman.org/assets/${assetId.toString()}/icon.png`
  return (
    <img
      src={logo}
      alt="Asset Logo"
      loading="lazy"
      className={`object-contain rounded-full shadow-lg hidden ${className}`}
      onLoad={(e) => e.currentTarget.classList.remove('hidden')}
      onError={(e) => e.currentTarget.classList.add('hidden')}
    />
  )
}
const AssetModal: React.FC<IdProps & { onClose: () => void }> = ({ id: assetId, onClose }) => {
  if (!assetId) return null // Don't render anything if modal is closed
  // TODO: Detailed fetches
  const operator = null
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        {/* Modal Header */}
        <h3 className="font-bold text-lg text-gray-800">Asset Details</h3>

        {/* Modal Content */}
        <div className="mt-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <AssetImage id={assetId} />
          </div>

          {/* ID */}
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-800">ID: </span>
            {assetId.toString()}
          </p>

          {/* Operator */}
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-semibold text-gray-800">Operator: </span>
            {operator}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="modal-action">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


const AssetTable: React.FC<IdProps> = ({ id: appId }) => {
  const [abelSdk] = useState(
    () =>
      new AbelSDK({
        algorand: AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment() }),
        appId: appId || DEFAULT_APP_ID,
      }),
  )

  const [currentAsset, setCurrentAsset] = useState<bigint | null>(null)
  const [assets, setAssets] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assetRows, setAssetRows] = useState<(AssetSmall & { id: bigint })[]>([])
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: PAGE_SIZE,
    page: 0,
  });

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      valueGetter: (v: bigint) => v.toString(),
    },
    { field: 'unitName', headerName: 'UNIT', width: 100 },
    { field: 'name', headerName: 'Name', width: 300 },
    { field: 'decimals', headerName: 'Decimals', width: 80, valueGetter: (v: bigint) => v.toString() },
    { field: 'total', headerName: 'Total', width: 150 },
    { field: 'hasClawback', headerName: 'CB - Clawback', width: 55, type: 'boolean' },
    { field: 'hasFreeze', headerName: 'FR - Freeze', width: 55, type: 'boolean' },
    { field: 'labels', headerName: 'Labels', width: 150, type: 'custom', valueGetter: (v: string[]) => v.join(', ') },

  ]

  useEffect(() => {
    if (!appId || !assets.length) return
    async function fetchDetails() {
      const start = paginationModel.page * paginationModel.pageSize
      const end = start + paginationModel.pageSize
      try {
        setAssetRows(Array.from(await abelSdk.getAssetsSmall(assets.slice(start, end))).map((kv) => kv[1]))
      } catch (err) {
        setError('Failed to fetch assets details. Please try again later.')
      }
    }
    fetchDetails()
  }, [appId, assets, paginationModel])

  // Fetch Assets
  useEffect(() => {
    if (!appId) return
    const fetchAssets = async () => {
      try {
        setLoading(true)
        setAssets(await abelSdk.getAllAssetIDs())
      } catch (err) {
        setError('Failed to fetch assets. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [appId, paginationModel])
  if (!appId)
    return (
      <div className="p-4 bg-gray-100 rounded-lg shadow">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Asset List</h1>
        <p className="text-gray-500">Please enter an App ID to view assets.</p>
      </div>
    )
  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Asset List</h1>
      {loading ? (
        <p className="text-blue-500">Loading assets...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : assets.length > 0 ? (
        <DataGrid
          paginationMode="server"
          rowCount={assets.length}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[PAGE_SIZE]} rows={assetRows} columns={columns} />
      ) : (
        <p className="text-gray-500">No assets found.</p>
      )}
      <AssetModal id={currentAsset} onClose={() => setCurrentAsset(null)} />
    </div>
  )
}

export default AssetTable
