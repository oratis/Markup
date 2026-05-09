#!/usr/bin/env python3
"""Generate placeholder PNG icons for Tauri spike phase.

Real icons should replace these before public release.
Writes:
  src-tauri/icons/32x32.png
  src-tauri/icons/128x128.png
  src-tauri/icons/128x128@2x.png   (256x256)
  src-tauri/icons/icon.png         (512x512, used to derive icns later)
"""
from __future__ import annotations
import os, struct, zlib, sys


def png_solid(path: str, w: int, h: int, rgba=(36, 90, 168, 255)) -> None:
    """Write a solid-color RGBA PNG. Tauri requires RGBA (alpha channel) for app icons."""
    raw = bytearray()
    for _ in range(h):
        raw.append(0)  # filter byte
        raw.extend(rgba * w)

    def chunk(typ: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA (color type 6)
    idat = zlib.compress(bytes(raw), 9)

    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, "src-tauri", "icons")
    os.makedirs(out, exist_ok=True)

    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
    }
    for name, size in sizes.items():
        png_solid(os.path.join(out, name), size, size)
        print(f"wrote {name} ({size}x{size})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
