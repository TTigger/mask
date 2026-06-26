# Correctness against PyTorch (`test/test_engine.py`)

Tests pin micrograd's autodiff to PyTorch as the reference: the same expression is
built once with `Value` and once with `torch.Tensor([...]).double()` (with
`requires_grad = True`), both are `.backward()`-ed, then forward `.data` and
backward `.grad` are compared. [src:r6]

- `test_sanity_check` — a small expression (`z = 2*x + 2 + x; q = z.relu() + z*x; …`);
  asserts `ymg.data == ypt.data.item()` and `xmg.grad == xpt.grad.item()` **exactly**. [src:r6]
- `test_more_ops` — a larger expression exercising `+ - * / ** relu` and in-place
  `+=`; asserts forward and both input grads match within `tol = 1e-6`. [src:r6]

Running them needs PyTorch installed (test-only dependency); `python -m pytest`. [src:r1, r6]
