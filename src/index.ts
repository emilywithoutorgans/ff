import binaryen from "binaryen";
import mod from "./mod.js";
import { writeFile } from "fs/promises";
import { Fn, functions } from "./parser.js";
import { Type, TypeKind } from "./type.js";
import { reifyType } from "./env.js";
import { Expr } from "./expr.js";
import { TokenKind } from "./lex.js";

function compileExpr(expr: Expr): binaryen.ExpressionRef {
    if (expr.kind === TokenKind.Number) {
        const type = reifyType(expr.type);
        if (type === undefined) throw new Error("number has no type");
        if (type.kind === TypeKind.Variable) throw new Error("number hasn't been coerced");
        if (type.kind === TypeKind.I32) {
            return mod.i32.const(parseInt(expr.value));
        } else {
            throw new Error("invalid number type");
        }
    }
    let _: never = expr.kind;
    return _;
}

function compileType(type: Type): binaryen.Type {
    switch (type.kind) {
        case TypeKind.Variable:
            throw new Error("type variable could not be narrowed");
        case TypeKind.I8:
        case TypeKind.I16:
        case TypeKind.U8:
        case TypeKind.U16:
            throw new Error("todo");
        case TypeKind.I32:
        case TypeKind.U32:
            return binaryen.i32;
        case TypeKind.I64:
        case TypeKind.U64:
            return binaryen.i64;
        case TypeKind.F32:
            return binaryen.f32;
        case TypeKind.F64:
            return binaryen.f64;
    }
    let _: never = type.kind;
    return _;
}

function compileFunction(fn: Fn) {
    const returnType = compileType(fn.returnType);
    const body = compileExpr(fn.body);
    mod.addFunction(fn.name, binaryen.none, returnType, [], body);
    if (fn.exportAs) mod.addFunctionExport(fn.name, fn.exportAs);
}

for (const fn of functions.values()) {
    compileFunction(fn);
}

// mod.optimize();

if (!mod.validate()) throw new Error("validation error");

const textData = mod.emitText();
const wasmData = mod.emitBinary();

writeFile("main.wat", textData);
writeFile("main.wasm", wasmData);