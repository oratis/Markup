#!/usr/bin/env python3
"""Generate a synthetic markdown file for performance testing (spike 0.2).

Usage:
  ./scripts/gen-test-doc.py [size_mb] [output_path]

Defaults: 5 MB → ./test-fixtures/big.md

The synthesized doc mixes prose, tables, lists, code blocks, math, and Mermaid
to stress every plugin Markup will run.
"""
from __future__ import annotations
import os, sys, random


WORDS = (
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod "
    "tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam "
    "quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo"
).split()


def paragraph(min_words=40, max_words=120, rng=random.Random(0)) -> str:
    n = rng.randint(min_words, max_words)
    sentence = []
    out = []
    for _ in range(n):
        sentence.append(rng.choice(WORDS))
        if len(sentence) > rng.randint(8, 18):
            s = " ".join(sentence).capitalize() + "."
            out.append(s)
            sentence = []
    if sentence:
        out.append(" ".join(sentence).capitalize() + ".")
    return " ".join(out)


def code_block(rng) -> str:
    lang = rng.choice(["ts", "py", "rust", "go", "json"])
    body = "\n".join(
        f"  let x{i} = {rng.randint(0, 999)};" for i in range(rng.randint(8, 24))
    )
    return f"```{lang}\n{body}\n```"


def table(rng) -> str:
    cols = rng.randint(3, 6)
    rows = rng.randint(3, 8)
    head = "| " + " | ".join(f"col{i}" for i in range(cols)) + " |"
    sep = "| " + " | ".join("---" for _ in range(cols)) + " |"
    body = "\n".join(
        "| " + " | ".join(rng.choice(WORDS) for _ in range(cols)) + " |"
        for _ in range(rows)
    )
    return "\n".join([head, sep, body])


def math_block() -> str:
    return "$$\n\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}\n$$"


def mermaid_block(rng) -> str:
    n = rng.randint(3, 6)
    edges = "\n    ".join(
        f"N{i} --> N{i+1}" for i in range(n - 1)
    )
    return f"```mermaid\ngraph TD\n    {edges}\n```"


def section(idx: int, rng) -> str:
    parts = [f"## Section {idx}", paragraph(rng=rng)]
    n_items = rng.randint(3, 7)
    parts.append("\n".join(f"- {rng.choice(WORDS)} {rng.choice(WORDS)}" for _ in range(n_items)))
    parts.append(paragraph(rng=rng))
    parts.append(code_block(rng))
    parts.append(table(rng))
    parts.append(paragraph(rng=rng))
    if rng.random() < 0.5:
        parts.append(math_block())
    if rng.random() < 0.4:
        parts.append(mermaid_block(rng))
    return "\n\n".join(parts)


def main() -> int:
    size_mb = float(sys.argv[1]) if len(sys.argv) > 1 else 5.0
    out_path = sys.argv[2] if len(sys.argv) > 2 else "test-fixtures/big.md"
    target_bytes = int(size_mb * 1024 * 1024)

    rng = random.Random(42)
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    written = 0
    idx = 0
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# Performance fixture ({size_mb} MB)\n\n")
        written += f.tell()
        while written < target_bytes:
            block = section(idx, rng) + "\n\n"
            f.write(block)
            written += len(block.encode("utf-8"))
            idx += 1
            if idx % 200 == 0:
                print(f"  ...{written / 1024 / 1024:.1f} MB ({idx} sections)")

    print(f"wrote {out_path} — {written/1024/1024:.2f} MB, {idx} sections")
    return 0


if __name__ == "__main__":
    sys.exit(main())
