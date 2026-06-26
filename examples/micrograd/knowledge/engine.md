# The autograd engine (`micrograd/engine.py`)

`Value` stores one scalar `.data` and its `.grad` (initialized to `0`). Internal
autograd state: `_backward` (a closure, default `lambda: None`), `_prev` (the set
of child/parent `Value`s), and `_op` (a string tag for graphviz/debugging only). [src:r3]

Each forward operation constructs an output node whose `_children` are its operands
and assigns a `_backward` closure that pushes the local partial derivative ×
`out.grad` into each operand's `.grad`, accumulating with `+=`:
- `__add__`: each parent gets `out.grad`. [src:r3]
- `__mul__`: `self.grad += other.data * out.grad` and symmetrically. [src:r3]
- `__pow__` (int/float exponent only, asserted): `self.grad += (other * self.data**(other-1)) * out.grad`. [src:r3]
- `relu`: `out.data = 0 if self.data < 0 else self.data`; `self.grad += (out.data > 0) * out.grad`. [src:r3]

`backward()` does reverse-mode autodiff over the whole DAG: build a topological
order with a recursive DFS over `_prev` (post-order append into `topo`), set
`self.grad = 1` (the seed), then run each node's `_backward()` in `reversed(topo)`.
Accumulation (`+=`) is what makes a value reused in multiple subexpressions
correct. [src:r3]

Operator coverage is derived from primitives: `__neg__ = self * -1`,
`__sub__ = self + (-other)`, `__truediv__ = self * other**-1`, plus the reflected
`__radd__/__rsub__/__rmul__/__rtruediv__`. Only add/mul/pow/relu/backward hold real
logic. see also [[adding-an-op]]. [src:r3]
