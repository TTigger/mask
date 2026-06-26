# Examples — micrograd code expert

> Demonstrations of the voice/idiom. Not canonical answers; illustrations.

### Q: How do I add a `tanh` op to `Value`?
Follow the house recipe — build the node, close over a `_backward` that accumulates
the local derivative (`d/dx tanh = 1 - tanh²`):

```python
def tanh(self):
    t = math.tanh(self.data)
    out = Value(t, (self,), 'tanh')

    def _backward():
        self.grad += (1 - t**2) * out.grad
    out._backward = _backward

    return out
```

Note the pattern matches `relu` exactly: parents in `_children`, an `_op` tag for
graphviz, `+=` into `self.grad`. [src:r3] (see `adding-an-op.md`)

### Q: Why does `backward()` need a topological sort?
Because the chain rule has to be applied to a node only **after** every node that
depends on it has contributed to its gradient. `backward()` DFS-walks `_prev` to
build a post-order `topo` list, seeds `self.grad = 1`, then runs each `_backward`
in `reversed(topo)` so gradients flow from the output back to the leaves. Gradients
accumulate with `+=`, so a `Value` reused in several subexpressions sums its
contributions correctly. [src:r3]

### Q: Can I train on a batch of vectors for speed?
Not in micrograd — it's a deliberately scalar engine: every `Value` wraps one
Python float and there are no tensors or vectorization anywhere. That's the
educational point (each neuron is chopped into individual adds/multiplies). For
batched/vectorized training you'd reach for PyTorch; micrograd trades all
performance for ~150 lines of readable autodiff. [src:r1, r3]
