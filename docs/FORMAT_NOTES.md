# CUR and ANI Format Notes

## CUR

`encodeCur()` produces one PNG-backed cursor image:

1. 6-byte `ICONDIR`: reserved `0`, type `2`, image count `1`.
2. 16-byte directory entry: width, height, hotspot X/Y, payload size, and payload offset.
3. PNG payload beginning at byte offset 22.

All multi-byte values are little-endian. Hotspots are clamped independently to the selected cursor width and height.

## ANI

`encodeAni()` produces a RIFF `ACON` file containing:

- `anih` with the 36-byte animation header.
- `rate` with one 32-bit jiffy duration per displayed frame.
- `LIST fram` with one padded `icon` chunk per embedded CUR frame.

RIFF chunk payloads are padded to an even byte boundary. The RIFF size excludes the initial `RIFF` identifier and size field.

`seq ` is intentionally omitted because Cursor Atelier currently plays each stored frame exactly once in natural order. It becomes necessary only if a later editor supports reordering, repetition, or a step sequence different from the stored frame order.

## GIF composition

`gifuct-js` supplies decompressed image patches and metadata. Cursor Atelier then:

- alpha-composites each local patch over the logical screen;
- preserves underlying pixels for transparent patch pixels;
- clears or restores the affected rectangle for disposal method 2;
- restores the previous logical screen for disposal method 3;
- stores each fully composited logical screen as an exportable frame.
