from algopy import (
    Account,
    ARC4Contract,
    BoxMap,
    String,
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

NOT_FOUND = 2**32 - 1  # magic constant for "not found in list"


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
        self.labels = BoxMap(String, LabelDescriptor, key_prefix=b"")
        self.operators = BoxMap(Account, LabelList, key_prefix=b"")

    # label ops. admin only

    @abimethod()
    def add_label(self, id: String, name: String) -> None:
        # TODO admin only
        ensure(id not in self.labels, S("ERR:EXISTS"))
        ensure(id.bytes.length == 2, S("ERR:LENGTH"))
        self.labels[id] = LabelDescriptor(
            arc4.String(name),
            arc4.UInt64(0),
            arc4.UInt64(0),
        )

    @abimethod()
    def remove_label(self, id: String) -> None:
        # TODO admin only
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
    def get_operator_label_index(self, operator: Account, label: String) -> UInt64:
        ensure(operator in self.operators, S("ERR:NOEXIST"))
        for idx, stored_label in uenumerate(self.operators[operator]):
            if stored_label == label:
                return idx
        return UInt64(NOT_FOUND)

    @abimethod()
    def add_operator_to_label(self, operator: Account, label: String) -> None:
        ensure(label in self.labels, S("ERR:NOEXIST"))
        # check if operator exists already
        if operator in self.operators:
            # existing operator, check for duplicate
            ensure(
                self.get_operator_label_index(operator, label) == UInt64(NOT_FOUND),
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
        ensure(label in self.labels, S("ERR:NOEXIST"))
        ensure(operator in self.operators, S("ERR:NOEXIST"))

        label_idx = self.get_operator_label_index(operator, label)
        ensure(label_idx != UInt64(NOT_FOUND), S("ERR:NOEXIST"))

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
