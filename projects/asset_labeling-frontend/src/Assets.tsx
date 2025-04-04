import React, { useEffect, useState } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AbelSDK } from 'abel-sdk'
import { getAlgodConfigFromViteEnvironment } from './config'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import Typography from '@mui/material/Typography'
import { AssetSmall } from 'abel-sdk/dist/generated/abel-contract-client'
import Alert from '@mui/material/Alert'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import { Container } from '@mui/material'

const DEFAULT_APP_ID = 2888048711n
const PAGE_SIZE = 100

type IdProps = {
  id: bigint | null // The App ID for the AbelSDK
}
const AssetTable: React.FC<IdProps> = ({ id: appId }) => {
  const [abelSdk] = useState(
    () =>
      new AbelSDK({
        algorand: AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment() }),
        appId: appId || DEFAULT_APP_ID,
      }),
  )
  const [assets, setAssets] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assetRows, setAssetRows] = useState<(AssetSmall & { id: bigint })[]>([])
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: PAGE_SIZE,
    page: 0,
  })

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      valueGetter: (v: bigint) => v.toString(),
    },
    { field: 'unitName', headerName: 'UNIT', minWidth: 100 },
    { field: 'name', headerName: 'Name', minWidth: 300 },
    { field: 'decimals', headerName: 'Decimals', minWidth: 80, valueGetter: (v: bigint) => v.toString() },
    { field: 'total', headerName: 'Total', minWidth: 200 },
    { field: 'hasClawback', headerName: 'CB - Clawback', minWidth: 55, type: 'boolean' },
    { field: 'hasFreeze', headerName: 'FR - Freeze', minWidth: 55, type: 'boolean' },
    { field: 'labels', headerName: 'Labels', minWidth: 150, type: 'custom', valueGetter: (v: string[]) => v.join(', ') },
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
      <div>
        <Typography variant="h3">Asset List</Typography>
        <Alert icon={<InfoIcon fontSize="inherit" />} severity="warning">
          Please enter an App ID to view assets.
        </Alert>
      </div>
    )
  return (
    <Container>
      <Typography variant="h3">Asset List</Typography>
      {loading ? (
        <Alert icon={<InfoIcon fontSize="inherit" />} severity="warning">
          Loading assets...
        </Alert>
      ) : error ? (
        <Alert icon={<ErrorIcon fontSize="inherit" />} severity="error">
          {error}
        </Alert>
      ) : assets.length > 0 ? (
        <>
          <Alert icon={<InfoIcon fontSize="inherit" />} severity="info">
            {`Showing ${assets.length} assets`}
          </Alert>
          <DataGrid
            paginationMode="server"
            rowCount={assets.length}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[PAGE_SIZE]}
            rows={assetRows}
            columns={columns}
          />
        </>
      ) : (
        <Alert icon={<ErrorIcon fontSize="inherit" />} severity="error">
          "No Assets Found
        </Alert>
      )}
    </Container>
  )
}

export default AssetTable
