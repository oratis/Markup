# Features

A quick tour of what Markup renders. Back to [[welcome]].

## Code

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("reviewer"))
```

## Table

| Feature        | iOS | Mac |
|----------------|:---:|:---:|
| Read & render  |  ✅ |  ✅ |
| Full-text search |  ✅ |  ✅ |
| WYSIWYG editor |  —  |  ✅ |
| Live split preview (iPad) | ✅ | — |

## Task list

- [x] Open a folder
- [x] Read a note
- [ ] Edit and save

## Callouts (GitHub-style alerts)

> [!TIP]
> These callout blocks render the same in the editor, the reader, and exports.

> [!WARNING]
> Markup never sends your notes anywhere. See PRIVACY.

## Math (when enabled)

The quadratic roots are $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

## Diagram (when enabled)

```mermaid
flowchart LR
    A[Open folder] --> B[Read]
    B --> C[Edit]
    C --> D[Export / Share]
```

## Tags

#sample #features
