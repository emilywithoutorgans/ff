import { inferred } from "./env.js";
import { popToken, state, TokenKind } from "./lex.js";
import { Type } from "./type.js";

export type NumberExpression = { kind: TokenKind.Number, type: Type, value: string, isDecimal: boolean };
export type Expr = NumberExpression;
export type Untyped<T extends Expr> = Omit<T, 'type'>;
export type UntypedExpr = Untyped<Expr>;

function number(): Expr | null {
    if (state.token.kind !== TokenKind.Number) return null;
    return inferred(popToken(state.token));
}

export function expr() {
    const res = number();
    if (res !== null) return res;
    throw new Error("invalid expression");
}