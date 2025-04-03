from algopy import String, arc4

S = String

LabelList = arc4.DynamicArray[arc4.String]


class LabelDescriptor(arc4.Struct):
    name: arc4.String
    num_assets: arc4.UInt64
    num_operators: arc4.UInt64


# MVP view, e.g. for display an axfer row
class AssetMicro(arc4.Struct):
    unit_name: arc4.String
    decimals: arc4.UInt8


# Above plus labels
class AssetMicroLabels(arc4.Struct):
    unit_name: arc4.String
    decimals: arc4.UInt8
    labels: LabelList


# Searchable text view
class AssetText(arc4.Struct):
    name: arc4.String
    unit_name: arc4.String
    url: arc4.String
    labels: LabelList


# Searchable text view plusllabels
class AssetTextLabels(arc4.Struct):
    name: arc4.String
    unit_name: arc4.String
    url: arc4.String


# Small view, what a hover card on an explorer may show
class AssetSmall(arc4.Struct):
    name: arc4.String
    unit_name: arc4.String
    decimals: arc4.UInt8
    total: arc4.UInt64
    has_freeze: arc4.Bool
    has_clawback: arc4.Bool
    labels: LabelList


# Full view, everything from algod /v2/assets API + reserve  balance
class AssetFull(arc4.Struct):
    name: arc4.String
    unit_name: arc4.String
    url: arc4.String

    total: arc4.UInt64
    decimals: arc4.UInt8

    manager: arc4.Address
    freeze: arc4.Address
    clawback: arc4.Address
    reserve: arc4.Address

    metadata_hash: arc4.DynamicBytes
    reserve_balance: arc4.UInt64
    labels: LabelList
