#!/bin/bash

set -eo pipefail

cd "$(realpath "$(dirname "$0")")"

artifacts_dir=$(realpath ../artifacts)
src_dir=$(realpath ../src)

cd ../../asset_labeling-contracts

contract_file=$(realpath smart_contracts/asset_labeling/contract.py)

set -o xtrace
algokit --no-color compile python "$contract_file" --out-dir="$artifacts_dir" --output-arc32 --no-output-arc56 --no-output-source-map --no-output-teal

cd -

npx --yes  @algorandfoundation/algokit-client-generator generate -a "$artifacts_dir/AssetLabeling.arc32.json" -o "$src_dir/generated/abel-contract-client.ts"
