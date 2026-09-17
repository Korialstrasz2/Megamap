# Next agent: create more battle-map assets

**Status:** the battle generator now plans rooms from an ordered **zone program**
(see `src/engine.js` → `ZONE_ROLES`, `THEME_ZONES`, `planRoomComplex`,
`planCaveZones`, `planRouteZones`). Each zone role lists the symbols used to
furnish it. Several roles reuse an approximate symbol because no exact one
exists yet. That is the gap this note is about.

The asset count is **246** and several tests assert it exactly. Adding assets is
therefore a deliberate, counted change: add the artwork, add it to the relevant
`ZONE_ROLES[...].props` arrays, regenerate the catalog, and update the counts in
the files listed at the bottom.

## 1. How an asset is added

1. Edit `src/assets.js`: append an entry to `catalog`:
   `{id:'kebab-case-id',name:'Human readable name',category:'Dungeon',body:'<svg body>',tags:'search words'}`
   - `body` is raw SVG drawn in the shared `-28 -28 56 56` viewBox (centred on
     `0,0`, roughly ±25 usable). Do **not** include `<svg>`, `id`, `fill` on the
     root or any external reference.
   - Use palette placeholders, never literal colours: `@paper @ink @roof @water
     @forest @hill @sand @grass @mountain @deep @snow @road @land`. `@roof` maps
     to `p.roof[1]`.
   - 40 older symbols still live as hand-written bodies in `src/render.js` →
     `symbols()` (they have no `body` in the catalog). New work goes in
     `src/assets.js`; do not copy that legacy pattern.
2. Run `node scripts/build-assets.cjs` to regenerate `assets/catalog.json`,
   `assets/catalog.html` and the 246+ standalone files in `assets/svg/`.
3. Add the new ids to the matching zone roles in `src/engine.js`. Props are
   filtered through `ASSETS.includes(...)` at generation time, so a typo fails
   silently — run the tests.
4. Optional but encouraged: add a Node assertion in
   `tests/battle-zones.test.cjs` that the zone using the new symbol places it.

## 2. Symbols the zone system wants next

Ordered by how often the current approximation is visible on a generated map.

| Zone role(s) | Missing symbol | Currently used instead |
| --- | --- | --- |
| `kitchen`, `bar`, `mess` | Work/prep bench, trestle table with plates | `counter`, `long-table` |
| `bar`, `cellar` | Bar counter with taps, wine rack | `counter`, `barrel` |
| `prison`, `cells` | Cell door with grate, straw pallet, wall manacles | `cage`, `chain`, `bedroll` |
| `treasury`, `reliquary` | Coin piles, chained strongbox, counting table | `chest`, `treasure-pile` |
| `library` | Reading lectern, scroll rack, fallen book stack | `desk`, `bookshelf` |
| `shrine`, `altar`, `nave` | Offering bowl, censer, pew row | `altar`, `brazier`, `bench` |
| `workshop` | Forge with hood, tool rack, quench trough | `anvil`, `desk`, `barrel` |
| `crypt` | Ajar coffin lid, ossuary niche, candle stand | `sarcophagus`, `bones` |
| `outfall`, `junction`, `cistern` (sewer) | Sluice gate, pipe outlet, raised walkway, grate | `reeds`, `lily-pads`, `barrel` |
| `cavern`, `grotto`, `deep` | Stalagmites, stalactites, underground pool, frozen corpse | `crystal`, `boulder`, `bones` |
| `clearing`, `camp`, `trailhead` (outdoor) | Lean-to, bedroll circle, tracks, broken cart | `tent`, `camp`, `wagon` |
| All complex themes | Door leaf drawn at generated portal positions | Doorways are only cut from the wall (no leaf symbol) |

The sewer role `junction` already filtered a `grate` id that never existed —
`['reeds','boulder','grate','barrel'].filter(a=>ASSETS.includes(a))` in the old
generator — which is direct evidence of this gap.

## 3. Counted files to update when the total changes

| File | What asserts the count |
| --- | --- |
| `tests/v1.test.cjs` | 246 unique ids, 12 categories, 206 catalogue bodies |
| `tests/engine.test.cjs` | 246 assets render |
| `tests/v12.test.cjs` | `docs/NEW_ASSETS_V12.json` says 103 additions / 246 total |
| `docs/NEW_ASSETS_V12.json` | machine-readable addition list |
| `assets/README.md`, `README.md` | prose totals |
| `README.html`, `README.txt` | mirrored copies of `README.md` |

## 4. Release housekeeping that is currently stale

These verification artefacts still describe the previous build and must be
regenerated before packaging:

- `docs/SHA256_MANIFEST.json` (every edited file now mismatches
  `node scripts/verify-package.cjs`),
- `docs/NODE_TEST_LOG.txt`, `docs/TEST_RESULTS.txt`,
- `docs/BROWSER_TEST_RESULTS.json`, `docs/BROWSER_V12_RESULTS.json`,
- `docs/guide.html` and `README.html` (mirrors of the Markdown docs).

Current measured counts after the zone-program change: **220 Node tests and 55
Chromium workflow checks**, no unhandled page errors.
