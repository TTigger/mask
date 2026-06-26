# The neural-net library (`micrograd/nn.py`)

A four-class hierarchy on top of the engine; `nn.py` imports `Value` from
`micrograd.engine`. see also [[engine]]. [src:r4]

- `Module` — base class with `zero_grad()` (sets every parameter's `.grad = 0`)
  and `parameters()` (returns `[]`, overridden by subclasses). [src:r4]
- `Neuron(nin, nonlin=True)` — weights `w = [Value(random.uniform(-1,1)) for _ in range(nin)]`
  and bias `b = Value(0)`. Called as `act = sum((wi*xi for wi,xi in zip(w, x)), b)`,
  returning `act.relu()` when `nonlin` else the raw `act`. `parameters()` is `w + [b]`.
  `__repr__` → e.g. `"ReLUNeuron(2)"`. [src:r4]
- `Layer(nin, nout, **kwargs)` — a list of `nout` neurons; calling it returns a
  single `Value` if `nout == 1` else a list. `parameters()` flattens its neurons'. [src:r4]
- `MLP(nin, nouts)` — builds layers from sizes `[nin] + nouts`, making each layer
  non-linear **except the last** (`nonlin = i != len(nouts)-1`). Calling it threads
  `x` through every layer. `parameters()` flattens all layers'. [src:r4]

Optimization (SGD) and the SVM max-margin loss are NOT in this module — they live
in the demo notebook, which was not part of the digest. [src:r1, r4]
