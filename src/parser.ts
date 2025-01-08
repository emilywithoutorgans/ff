// parse into a (solved) IR

import mod from "./mod.js";
import { EOF, ident, nextToken, skip, state, TokenKind } from "./lex.js";
import { Expr, expr } from "./expr.js";
import { Type, type } from "./type.js";
import { infer, solve } from "./env.js";

export type Fn = { name: string, exportAs?: string, returnType: Type, body: Expr };
export const functions: Map<string, Fn> = new Map();

function pushFunction(fn: Fn) {
    if (functions.has(fn.name)) throw new Error(`function with name "${fn.name}" already exists`);
    functions.set(fn.name, fn);
}

function addFunction(): Fn | null {
    if (state.token.kind !== TokenKind.Function) return null;
    nextToken();

    const name = ident();
    if (skip(TokenKind.LParen)) skip(TokenKind.RParen);

    let returnType = undefined;
    if (skip(TokenKind.Colon)) {
        returnType = type();
    }

    const body = expr();
    returnType ??= infer(body);

    const fn: Fn = { name, returnType, body };
    pushFunction(fn);

    return fn;
}

function addExport(): boolean {
    if (state.token.kind !== TokenKind.Export) return false;

    const n = nextToken(); // 'function' | 'as' | identifier

    // 'function'
    let fn = addFunction();
    if (fn !== null) {
        fn.exportAs = fn.name;
        return true;
    }

    if (n.kind === TokenKind.As) {
        nextToken();

        const alias = ident();

        const fn = addFunction();
        if (fn === null) throw new Error("expected function");

        fn.exportAs = alias;

        return true;
    } else if (n.kind === TokenKind.Identifier) {
        const name = n.value;
        nextToken();

        let alias = name;

        if (skip(TokenKind.As)) alias = ident();

        mod.addFunctionExport(name, alias);
        return true;
    }

    throw new Error("expected validity after export");
}

function item() {
    if (addFunction()) return;
    if (addExport()) return;
    throw new Error();
}

while (state.token !== EOF) item();

solve();