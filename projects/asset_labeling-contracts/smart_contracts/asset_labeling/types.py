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
