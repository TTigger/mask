# Adding a new differentiable op

The house recipe for any new operation on `Value` (the same shape every existing
op follows). see also [[engine]]. [src:r3]

1. Coerce non-`Value` operands at the top: `other = other if isinstance(other, Value) else Value(other)`.
2. Compute the forward result and build the node with its parents and an `_op` tag:
   `out = Value(<forward>, (self, other), '<symbol>')`.
3. Define a local closure `_backward()` that adds the **local partial derivative ×
   `out.grad`** into each operand's `.grad` using `+=` (never `=`).
4. Assign `out._backward = _backward` and `return out`.

Worked examples from the source: `__mul__` pushes `other.data * out.grad` into
`self.grad` (and symmetrically); `__pow__` pushes `(other * self.data**(other-1)) * out.grad`
and asserts the exponent is `int`/`float`; `relu` pushes `(out.data > 0) * out.grad`.
Because gradients accumulate, no extra bookkeeping is needed when a value feeds
multiple ops. [src:r3]
