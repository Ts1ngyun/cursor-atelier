# Third-Party Notices

Cursor Atelier includes or uses the following direct packages:

| Project | Purpose | License |
| --- | --- | --- |
| React and React DOM | User interface | MIT |
| gifuct-js | GIF parsing and LZW decompression | MIT |
| js-binary-schema-parser | Transitive parser used by gifuct-js | MIT |
| Vite and `@vitejs/plugin-react` | Development and production builds | MIT |
| TypeScript | Static type checking | Apache-2.0 |
| Vitest | Automated tests | MIT |
| Oxlint | Linting | MIT |
| Tauri | Optional Windows desktop application framework | Apache-2.0 OR MIT |
| Tauri dialog plugin | Native Save dialog in the desktop application | Apache-2.0 OR MIT |

Exact versions and the full transitive dependency graph are recorded in `package-lock.json`.

The CUR encoder, ANI encoder, ZIP writer, INF theme manifest generator, GIF frame compositor, hotspot calculations, Canvas rendering, and download logic in this repository were written specifically for Cursor Atelier. No GPL CUR or ANI encoder code is included. The INF syntax and Windows scheme role mapping follow public Microsoft Windows documentation; no third-party theme installer code was copied.
