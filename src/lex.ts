import { readFile } from "fs/promises";

const text = await readFile("./main.ff", "utf8");

export enum TokenKind {
    EOF,
    Function,
    Export,
    As,
    Identifier,
    Colon,
    LParen,
    RParen,
    Number
}

type SimpleToken = TokenKind.EOF | TokenKind.Function | TokenKind.Export | TokenKind.As | TokenKind.Colon | TokenKind.LParen | TokenKind.RParen;
export type Token = { kind: SimpleToken } | { kind: TokenKind.Identifier, value: string } | { kind: TokenKind.Number, value: string, isDecimal: boolean };
export const EOF = { kind: TokenKind.EOF } as const;

let cachedToken: Token | null = null;
function popCachedToken() {
    const token = cachedToken;
    cachedToken = null;
    return token;
}

let p = 0;
export const state: { token: Token } = { token: produceToken() };
export function nextToken(): Token {
    return state.token = produceToken();
}

function produceToken(): Token {
    return popCachedToken() || lexToken()
}

function lexToken(): Token {
    skipWhitespace();
    return lexTokenFromStart();
}

function skipWhitespace() {
    const whitespaceMatch = /^\s+/.exec(text.slice(p));
    if (whitespaceMatch === null) return false;
    p += whitespaceMatch[0].length;
    return true;
}

function lexTokenFromStart(): Token {
    const token = lexNonIdentTokenFromStart();
    if (token) return token;
    return lexIdent();
}

function lexNonIdentTokenFromStart(lexNumber = true): Token | null {
    if (p >= text.length) return EOF; // no more tokens to find

    // TODO: improve this
    if (lexNumber) {
        const numberMatch = /^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)/.exec(text.slice(p));
        if (numberMatch) {
            p += numberMatch[0].length;
            return { kind: TokenKind.Number, value: numberMatch[0], isDecimal: !!numberMatch[1] }
        }
    }

    const char = text[p];

    switch (char) {
        case ":":
            p++;
            return { kind: TokenKind.Colon };
        case "(":
            p++;
            return { kind: TokenKind.LParen };
        case ")":
            p++;
            return { kind: TokenKind.RParen };
    }

    return null;
}

function lexIdent(): Token {
    console.assert(cachedToken === null);

    let start = p;
    let end = start;
    while (true) {
        if (skipWhitespace()) break;

        cachedToken = lexNonIdentTokenFromStart(false);
        if (cachedToken) break;

        p++;
        end = p;
    }

    if (start === end) {
        console.assert(cachedToken);
        return popCachedToken()!;
    }

    const value = text.slice(start, end);

    switch (value) {
        case "export":
            return { kind: TokenKind.Export };
        case "function":
            return { kind: TokenKind.Function };
        case "as":
            return { kind: TokenKind.As };
    }

    return { kind: TokenKind.Identifier, value };
}

export function popToken<T extends Token>(res: T): T {
    nextToken();
    return res;
}

export function ident(): string {
    if (state.token.kind !== TokenKind.Identifier) throw new Error("identifier expected");
    return popToken(state.token).value;
}

export function skip(kind: TokenKind): boolean {
    const shouldSkip = state.token.kind == kind;
    if (shouldSkip) nextToken();
    return shouldSkip;
}

