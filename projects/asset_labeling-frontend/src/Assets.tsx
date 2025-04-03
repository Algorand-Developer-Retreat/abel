import React, { useEffect, useState } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AbelSDK } from 'abel-sdk'
import { getAlgodConfigFromViteEnvironment } from './config'

type IdProps = {
  id: bigint | null // The App ID for the AbelSDK
}

const AssetImage: React.FC<IdProps & {className?: string;}> = ({ id: assetId, className }) => {
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

const AssetList: React.FC<IdProps> = ({ id: appId }) => {
  const [currentAsset, setCurrentAsset] = useState<bigint | null>(null)
  const [assets, setAssets] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize AbelSDK
  useEffect(() => {
    if (!appId) return
    const fetchAssets = async () => {
      try {
        setLoading(true)

        const abelSdk = new AbelSDK({
          algorand: AlgorandClient.fromConfig({ algodConfig: getAlgodConfigFromViteEnvironment() }),
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
        <ul className="divide-y divide-gray-300">
          {assets.map((assetId, index) => (
            <li key={index} className="py-2">
              <button className="text-blue-500 hover:underline flex" onClick={() => setCurrentAsset(assetId)}>
                <span className="text-gray-700">Verified ID:</span>
                <span className="font-mono font-bold flex-1">{assetId.toString()}</span>
                <AssetImage id={assetId} className={'ml-1 mt-1 w-4 h-4'} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No assets found.</p>
      )}
      <AssetModal id={currentAsset} onClose={() => setCurrentAsset(null)} />
    </div>
  )
}

export default AssetList
