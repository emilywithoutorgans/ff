import { Expr, Untyped, UntypedExpr } from "./expr.js";
import { TokenKind } from "./lex.js";
import { assignFloatConstraints, assignIntConstraints } from "./number.js";
import { Type, TypeKind, Variable } from "./type.js";

// union-find

const parents: WeakMap<Type, Type> = new WeakMap();

function find(type: Type) {
    while (true) {
        const parent = parents.get(type);
        if (parent === undefined) return type;
        type = parent;
    }
}

// constraints

enum ConstraintKind {
    IsSubtypeOf,
    IsEqualTo
}

type IsSubtypeOfConstraint = { kind: ConstraintKind.IsSubtypeOf, color: number, left: Type, right: Type };
type IsEqualToConstraint = { kind: ConstraintKind.IsEqualTo, left: Type, right: Type };

type Constraint = IsSubtypeOfConstraint | IsEqualToConstraint;

const constraints: Constraint[] = [];
let worklist: Constraint[] = [];

let currentColor = -1;
export function addIsSubtypeOfConstraint(left: Type, right: Type) {
    currentColor += 1;

    const constraint: IsSubtypeOfConstraint = { kind: ConstraintKind.IsSubtypeOf, color: currentColor, left, right };
    constraints.push(constraint);
    worklist.push(constraint);
}

export function addIsEqualToConstraint(left: Type, right: Type) {
    const constraint: IsEqualToConstraint = { kind: ConstraintKind.IsEqualTo, left, right };
    constraints.push(constraint);
    worklist.push(constraint);
}

// SEI solver (a modification of Fritz Hanglein's PhD thesis, 1989)

type HalfIsSubtypeOf = { color: number, right: Type };
const isSubtypeOf: WeakMap<Type, HalfIsSubtypeOf[]> = new WeakMap();

function solveIsSubtypeOfConstraint(constraint: IsSubtypeOfConstraint) {
    if (constraint.left.kind === TypeKind.Variable) {
        // x <: ...

        // if we have something like
        // f(x, x) <:_i f(y, z)
        // by rule 2 we get the relations
        // (a)  x <:_i y 
        // (b)  x <:_i z
        // if we find (b) and have (a) in `isSubtypeOf`, then
        // we can assert that y = z

        const root = find(constraint.left);
        const subtypesOf = isSubtypeOf.get(root);
        const a = subtypesOf?.find(r => r.color === constraint.color);
        if (a !== undefined) {
            // y = z
            addIsEqualToConstraint(a.right, constraint.right);
        } else if (root.kind !== TypeKind.Variable) {
            // if root(x) is a functor then just propagate up
            // root(x) <: ...
            addIsSubtypeOfConstraint(root, constraint.right);
        }
    } else if (constraint.right.kind === TypeKind.Variable) {
        // note: constraint.left is a functor
        // ... <: x

        const root = find(constraint.right);
        if (root.kind === TypeKind.Variable) {
            // ... <: y = root(x)

            // TODO: functors with arity > 0

            // This is where the implementation deviates from the algorithm;
            // we will not add the functor to the equivalence class

            // TODO: comment this
            addIsEqualToConstraint(root, constraint.left);
        } else {
            // if root(x) is a functor then just propagate up
            // root(x) <: ...
            addIsSubtypeOfConstraint(constraint.left, root);
        }
    } else {
        if (constraint.left.kind !== constraint.right.kind) {
            throw new Error("subtype error")
        }
    }
}

function solveIsEqualToConstraint(constraint: IsEqualToConstraint) {
    if (constraint.left.kind !== TypeKind.Variable && constraint.right.kind !== TypeKind.Variable) {
        if (constraint.left.kind !== constraint.right.kind) {
            throw new Error("subtype error")
        }
        return;
    }

    const leftRoot = find(constraint.left);
    const rightRoot = find(constraint.right);

    let variable, other;
    if (leftRoot.kind === TypeKind.Variable) {
        variable = leftRoot;
        other = rightRoot;
    } else if (rightRoot.kind === TypeKind.Variable) {
        variable = rightRoot;
        other = leftRoot;
    } else {
        // the root is a functor, `other` is a functor, 
        // just propagate it up to the root to do the rule
        return addIsEqualToConstraint(leftRoot, rightRoot);
    }

    // at least one of the roots is a variable
    // merge the variable into the other equivalence class

    // here we want to reassign the root of `variable` to be `other`
    parents.set(variable, other);

    // propagate the constraints up by rule 3b
    propagateSubtypeRelations(variable, other);
}

function propagateSubtypeRelations(from: Type, to: Type) {
    const constraints = isSubtypeOf.get(from);
    const toPushInto = isSubtypeOf.get(to) ?? [];
    if (constraints !== undefined) for (const constraint of constraints) {
        constraint.right = find(constraint.right);
        toPushInto.push(constraint);
    }
    isSubtypeOf.set(to, toPushInto);
}

function solveConstraints(constraints: Constraint[]) {
    for (const constraint of constraints) {
        console.log("solving", constraint);
        if (constraint.kind === ConstraintKind.IsSubtypeOf) {
            solveIsSubtypeOfConstraint(constraint);
        } else {
            solveIsEqualToConstraint(constraint);
        }
    }
}

export function solve() {
    while (worklist.length > 0) {
        let prevWorklist = worklist;
        worklist = [];
        solveConstraints(prevWorklist);
    }
}

function createType(expr: UntypedExpr) {
    if (expr.kind === TokenKind.Number) {
        const type: Variable = { kind: TypeKind.Variable }; // instantiate new variable

        if (expr.isDecimal) {
            const value = parseFloat(expr.value);
            if (Number.isInteger(value)) {
                assignIntConstraints(type, BigInt(value));
            } else {
                assignFloatConstraints(type, value);
            }
        } else {
            assignIntConstraints(type, BigInt(expr.value));
        }

        return type;
    }
    let _: never = expr.kind;
    return _;
}

const typeCache = new WeakMap();
export function infer(expr: UntypedExpr): Type {
    const cached = typeCache.get(expr);
    if (cached !== undefined) return cached;
    const res = createType(expr);
    typeCache.set(expr, res);
    return res;
}

// helpers
export function reifyType(type: Type): Type {
    return find(type);
}

export function inferred<T extends Expr>(expr: Untyped<T>): T {
    let typedExpr = expr as T;
    typedExpr.type = infer(expr);
    return typedExpr;
}
