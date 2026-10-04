# Windows Compatibility Validation

Run this checklist before a release and record the Windows build numbers in the release notes.

## CUR

1. Export one 32×32, one 48×48, and one 64×64 CUR.
2. Include transparency touching at least one image edge.
3. Test hotspots at `0,0`, near the center, and at the bottom-right pixel.
4. Open **Mouse Properties → Pointers → Browse** and select each file.
5. Confirm the image renders correctly in the pointer preview.
6. Apply temporarily and confirm the click location matches the chosen hotspot.
7. Restore the original pointer scheme after testing.

## ANI

1. Export a multi-PNG ANI with a 100 ms frame interval.
2. Export a GIF-derived ANI containing transparency and a partial/disposal frame.
3. Test at 0.5×, 1×, and 2× global speed.
4. Load each ANI through **Mouse Properties → Pointers → Browse**.
5. Confirm frame order, transparency, loop behavior, hotspot, and approximate timing.

## Required environments

- One supported Windows 10 installation or virtual machine.
- One supported Windows 11 installation or virtual machine.

Automated byte-structure tests do not replace this operating-system validation.
