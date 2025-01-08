import { addIsSubtypeOfConstraint } from "./env.js";
import { TypeKind, Variable } from "./type.js";

const sintegerTypes = [[7n, TypeKind.I8], [15n, TypeKind.I16], [31n, TypeKind.I32], [63n, TypeKind.I64]] as const;
const uintegerTypes = [[8n, TypeKind.U8], [16n, TypeKind.U16], [32n, TypeKind.U32], [64n, TypeKind.U64]] as const;
const floatTypes = [[16777216, TypeKind.F32], [Number.MAX_SAFE_INTEGER, TypeKind.F64]] as const;

export function assignIntConstraints(left: Variable, x: bigint) {
    for (const [bits, kind] of sintegerTypes) {
        if (-(2n ** bits) <= x && x <= 2n ** bits - 1n)
            addIsSubtypeOfConstraint(left, { kind });
    }
    for (const [bits, kind] of uintegerTypes) {
        if (0 <= x && x <= 2n ** bits)
            addIsSubtypeOfConstraint(left, { kind });
    }
    for (const [range, kind] of floatTypes) {
        const r = BigInt(range)
        if (x >= -r && x <= r)
            addIsSubtypeOfConstraint(left, { kind });
    }
}

export function assignFloatConstraints(left: Variable, x: number) {
    for (const [range, kind] of floatTypes) {
        if (x >= -range && x <= range)
            addIsSubtypeOfConstraint(left, { kind });
    }
}