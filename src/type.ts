import { nextToken, state, TokenKind } from "./lex.js";

export enum TypeKind {
    Variable,
    I8,
    I16,
    I32,
    I64,
    U8,
    U16,
    U32,
    U64,
    F32,
    F64
}

export type Variable = { kind: TypeKind.Variable };
export type Type = { kind: TypeKind };

export function type(): Type {
    if (state.token.kind === TokenKind.Identifier) {
        if (state.token.value === "i32") {
            nextToken();
            return { kind: TypeKind.I32 };
        }
    }
    throw new Error("invalid type");
}