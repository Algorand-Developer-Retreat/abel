from algopy import String, arc4

S = String

LabelList = arc4.DynamicArray[arc4.String]


class LabelDescriptor(arc4.Struct):
    name: arc4.String
    num_assets: arc4.UInt64
    num_operators: arc4.UInt64


class AssetMicro(arc4.Struct):
    unit_name: arc4.String
    decimals: arc4.UInt8


class AssetMicroLabels(arc4.Struct):
    unit_name: arc4.String
    decimals: arc4.UInt8
    labels: LabelList
