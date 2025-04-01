from algopy import (
    Account,
    ARC4Contract,
    Asset,
    BoxMap,
    String,
    Txn,
    UInt64,
    arc4,
    log,
    op,
    subroutine,
    uenumerate,
)
from algopy.arc4 import abimethod

S = String

LabelList = arc4.DynamicArray[arc4.String]

NOT_FOUND_KEY = 2**32  # magic constant for "list not found"
NOT_FOUND_VALUE = 2**32 - 1  # magic constant for "not found in list"


@subroutine
def ensure(cond: bool, msg: String) -> None:  # noqa: FBT001
    if not cond:
        log(msg)
        op.err()


class LabelDescriptor(arc4.Struct):
    name: arc4.String
    num_assets: arc4.UInt64
    num_operators: arc4.UInt64


class AssetLabeling(ARC4Contract):
    def __init__(self) -> None:
        self.admin = Txn.sender
        self.labels = BoxMap(String, LabelDescriptor, key_prefix=b"")
        self.assets = BoxMap(Asset, LabelList, key_prefix=b"")
        self.operators = BoxMap(Account, LabelList, key_prefix=b"")

    @subroutine
    def admin_only(self) -> None:
        ensure(Txn.sender == self.admin, S("ERR:UNAUTH"))

    @abimethod()
    def change_admin(self, new_admin: Account) -> None:
        self.admin_only()
        self.admin = new_admin

    @abimethod()
    def add_label(self, id: String, name: String) -> None:
        self.admin_only()
        ensure(id not in self.labels, S("ERR:EXISTS"))
        ensure(id.bytes.length == 2, S("ERR:LENGTH"))
        self.labels[id] = LabelDescriptor(
            arc4.String(name),
            arc4.UInt64(0),
            arc4.UInt64(0),
        )

    @abimethod()
    def remove_label(self, id: String) -> None:
        self.admin_only()
        ensure(id in self.labels, S("ERR:NOEXIST"))
        ensure(id.bytes.length == 2, S("ERR:LENGTH"))
        ensure(self.labels[id].num_assets == 0, S("ERR:NOEMPTY"))
        del self.labels[id]

    @abimethod(readonly=True)
    def get_label(self, id: String) -> LabelDescriptor:
        ensure(id in self.labels, S("ERR:NOEXIST"))
        return self.labels[id]

    # operator<>label access ops. admin and operators

    @subroutine
    def admin_or_operator_only(self, label: String) -> None:
        if Txn.sender == self.admin:
            return
        self.operator_only(label)

    @subroutine
    def operator_only(self, label: String) -> None:
        ensure(
            self.get_operator_label_index(Txn.sender, label) != UInt64(NOT_FOUND_KEY)
            and self.get_operator_label_index(Txn.sender, label)
            != UInt64(NOT_FOUND_VALUE),
            S("ERR:UNAUTH"),
        )

    @subroutine
    def get_operator_label_index(self, operator: Account, label: String) -> UInt64:
        if operator not in self.operators:
            return UInt64(NOT_FOUND_KEY)
        for idx, stored_label in uenumerate(self.operators[operator]):
            if stored_label == label:
                return idx
        return UInt64(NOT_FOUND_VALUE)

    @abimethod()
    def add_operator_to_label(self, operator: Account, label: String) -> None:
        self.admin_or_operator_only(label)
        ensure(label in self.labels, S("ERR:NOEXIST"))
        # check if operator exists already
        if operator in self.operators:
            # existing operator, check for duplicate
            ensure(
                self.get_operator_label_index(operator, label)
                == UInt64(NOT_FOUND_VALUE),
                S("ERR:EXISTS"),
            )

            # add label to operator
            existing = self.operators[operator].copy()
            existing.append(arc4.String(label))
            self.operators[operator] = existing.copy()
        else:
            # new operator, create new box
            self.operators[operator] = arc4.DynamicArray(arc4.String(label))

        # increment label operators
        label_descriptor = self.labels[label].copy()
        label_descriptor.num_operators = arc4.UInt64(
            label_descriptor.num_operators.native + UInt64(1)
        )
        self.labels[label] = label_descriptor.copy()

    @abimethod()
    def remove_operator_from_label(self, operator: Account, label: String) -> None:
        self.admin_or_operator_only(label)

        ensure(label in self.labels, S("ERR:NOEXIST"))
        ensure(operator in self.operators, S("ERR:NOEXIST"))

        # ensure label exists in operator
        label_idx = self.get_operator_label_index(operator, label)
        ensure(
            label_idx != UInt64(NOT_FOUND_VALUE)
            and label_idx
            != UInt64(NOT_FOUND_KEY),  # key check redundant, checked above
            S("ERR:NOEXIST"),
        )

        # ensure only empty labels can be left operator-less
        label_descriptor = self.labels[label].copy()
        ensure(
            label_descriptor.num_operators > 1 or label_descriptor.num_assets == 0,
            S("ERR:NOEMPTY"),
        )
        # decr operator count
        label_descriptor.num_operators = arc4.UInt64(
            label_descriptor.num_operators.native - UInt64(1)
        )
        self.labels[label] = label_descriptor.copy()

        if self.operators[operator].length == 1:
            del self.operators[operator]
        else:
            next_list = arc4.DynamicArray[arc4.String]()
            # walk, push everything except index
            # this implementation walks twice (once in get_operator_label_index)
            # could be more efficient
            for idx, stored_label in uenumerate(self.operators[operator]):
                if label_idx != idx:
                    next_list.append(stored_label)

            self.operators[operator] = next_list.copy()

    @abimethod(readonly=True)
    def get_operator_labels(self, operator: Account) -> LabelList:
        ensure(operator in self.operators, S("ERR:NOEXIST"))
        return self.operators[operator]

    @subroutine
    def get_asset_label_index(self, asset: Asset, label: String) -> UInt64:
        if asset not in self.assets:
            return UInt64(NOT_FOUND_KEY)
        for idx, stored_label in uenumerate(self.assets[asset]):
            if stored_label == label:
                return idx
        return UInt64(NOT_FOUND_VALUE)

    @abimethod()
    def add_label_to_asset(self, label: String, asset: Asset) -> None:
        ensure(label in self.labels, S("ERR:NOEXIST"))

        self.operator_only(label)

        if asset in self.assets:
            # existing operator, check for duplicate
            ensure(
                self.get_asset_label_index(asset, label) == UInt64(NOT_FOUND_VALUE),
                S("ERR:EXISTS"),
            )

            # add label to operator
            existing = self.assets[asset].copy()
            existing.append(arc4.String(label))
            self.assets[asset] = existing.copy()
        else:
            # new operator, create new box
            self.assets[asset] = arc4.DynamicArray(arc4.String(label))

        # incr asset count
        label_descriptor = self.labels[label].copy()
        label_descriptor.num_assets = arc4.UInt64(
            label_descriptor.num_assets.native + UInt64(1)
        )
        self.labels[label] = label_descriptor.copy()

    @abimethod()
    def remove_label_from_asset(self, label: String, asset: Asset) -> None:
        ensure(label in self.labels, S("ERR:NOEXIST"))

        self.operator_only(label)

        found = False
        if self.assets[asset].length == 1:
            if self.assets[asset][0] == label:
                del self.assets[asset]
                found = True
            else:
                found = False
        else:
            next_list = arc4.DynamicArray[arc4.String]()
            # walk, push everything to new box except label
            # save $found to throw if not found
            for idx, stored_label in uenumerate(self.assets[asset]):
                if stored_label != label:
                    next_list.append(stored_label)
                else:
                    found = True

            self.assets[asset] = next_list.copy()

        ensure(found, S("ERR:NOEXIST"))

        # decr asset count
        label_descriptor = self.labels[label].copy()
        label_descriptor.num_assets = arc4.UInt64(
            label_descriptor.num_assets.native - UInt64(1)
        )
        self.labels[label] = label_descriptor.copy()

    @abimethod(readonly=True)
    def get_asset_labels(self, asset: Asset) -> LabelList:
        ensure(asset in self.assets, S("ERR:NOEXIST"))
        return self.assets[asset]
