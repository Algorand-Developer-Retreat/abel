import React, { useEffect, useState } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AbelSDK } from 'abel-sdk'
interface AssetListProps {
  appId: bigint // The App ID for the AbelSDK
}

const AssetList: React.FC<AssetListProps> = ({ appId }) => {
  const [assets, setAssets] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize AbelSDK
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)

        const abelSdk = new AbelSDK({
          algorand: AlgorandClient.fromEnvironment(),
          appId: appId,
        })

        const assetIDs = await abelSdk.getAllAssetIDs() // Fetch all asset IDs
        setAssets(assetIDs)
      } catch (err) {
        setError('Failed to fetch assets. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [appId])

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Asset List</h1>
      {loading ? (
        <p className="text-blue-500">Loading assets...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : assets.length > 0 ? (
        <ul className="divide-y divide-gray-300">
          {assets.map((assetId, index) => (
            <li key={index} className="py-2">
              <span className="text-gray-700">Asset ID:</span> <span className="font-mono font-bold">{assetId.toString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No assets found.</p>
      )}
    </div>
  )
}

export default AssetList
