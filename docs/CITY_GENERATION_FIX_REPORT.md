# Megamap city generation repair — completion report

Prepared 2026-09-17 against Megamap 1.2.0. Implements the full guide
`docs/CITY_GENERATION_LUNA_FIX_GUIDE.md` (Steps A–G). Evidence directories:
`docs/qa-city/before`, `docs/qa-city/after`, `docs/qa-city/browser-smoke`,
`docs/qa-city/browser-v12`.

## 1. Files changed and behaviour fixed

| File | Change |
| --- | --- |
| `src/engine.js` | Geometry predicates and policy constants; phased city pipeline; convex polygon difference; building footprint quality; planned open space; waterfront assignment/eligibility; prop occupancy checks; district diagnostics; `dist` switched from `Math.hypot` to `sqrt`. |
| `src/render.js` | Building roof art is placed at the fitted frame centre (`roofCx`/`roofCy`) instead of the mean-of-vertices centre. |
| `src/editor-core.js` | `translate`/`rotate`/`scale` move the roof frame centre with the polygon. |
| `src/i18n.js` | Updated docks-without-water warning; new "no waterfront available" warning (Italian included). |
| `src/app.js` | Unchanged; existing `#mapWarnings` surface and translation path are reused. |
| `tests/city-generation.test.cjs` | New: 32 focused tests (geometry oracles, difference fixtures, placement, quality, open space, waterfront, regeneration, matrix/stress). |
| `tests/v12.test.cjs` | Roof-variety fixture now provides water and asserts shipyards/fish markets. |
| `package.json` | `test` runs the new file as well. |
| `scripts/city-fix-repro.cjs`, `scripts/render-city-fix.py` | Reproducer and Chromium rasterizer from the guide (development/evidence only). |

Issue outcomes:

- **I1 props over buildings** — props are placed after all buildings with full
  transformed footprints checked against water, roads, protected symbols, every
  building (any ward) and every placed prop (any ward), with a 0.5-unit visible
  clearance. REPRO: props intersecting a building 79/83 → **0**; intersecting
  prop pairs 1 → **0**. DENSE: 117/123 → **0**; 5 → **0**.
- **I2 pointed/sliver buildings** — vertex cleanup (1e-4), bounded chamfering of
  tips below 15° with height/base > 0.12, minimum support width 2.4, fitted
  roof-frame aspect ≤ 6; substantial failures are recorded and retained as open
  remnants rather than filled with spikes. REPRO/DENSE buildings with true
  narrowness (< 2.4) 0/6 → **0/0**; roof-frame aspect > 6 2/2 → **0/0**.
  The old `maxEdge > 8 && minEdge < 3` heuristic is *not* used as an oracle; it
  is reported only as a comparison metric (REPRO 93 → 116, because the
  heuristic flags ordinary irregular footprints, exactly as the guide's
  correction 2 describes).
- **I3 water-related lost land** — the logical district polygons are unchanged;
  each district's temporary buildable plan applies the street setback once, then
  subtracts the real buffered river (finite capsules, half-width + 8, cap
  polygons that contain the true circle) and coastal water convex pieces with
  real polygon difference. Buildings in the river corridor 5/10 → **0/0**;
  land is kept on both banks (synthetic fixture and real scenes).
- **I4 unexplained open quarters** — open programs (market, gardens, cemetery,
  farming) plan one compact convex reservation per substantial dry component at
  35% of usable dry land, clipped away from protected objects, emitted as
  editable `area` features (`openSpace: true`, `purpose`, `ward`) on the terrain
  layer so they read with district overlays off. Detail density only gates
  decoration; `quarterDetail: 0` still removes every prop but keeps the ground.
  REPRO 0 → 15 reservations (17 566 units²); DENSE 0 → 11 (14 146 units²).
- **I5 inland waterfront activity** — docks is assigned to the best eligible
  waterfront fragment first (bank/shore gap ≤ 60, measured from real geometry);
  `shipyard`/`fishmarket` and `dry-dock`/`dock-crane`/`fishing-racks` require
  water, filtered per candidate footprint; warehouses, taverns and cargo yards
  stay legal inland; docks-only with no water is deterministic inland storage
  with warnings and diagnostics. REPRO shipyards/fish markets 37/39 (scattered)
  → **4/4**, all on the waterfront; water-dependent props away from water 8/10 →
  **0**.
- **I6 prop/road collisions and silent loss** — infrastructure (walls, towers,
  gates, approach roads, bridge corridors and their symbol footprints) is
  planned before content; props are checked against road corridors including
  the visible outer stroke. Buildings/props on roads 0 → 0 (previously
  unprotected); every rejection is counted per reason, `requested = placed +
  unplaced`, attempts are bounded at 65 per request.
- **Regeneration** — uses reservations and occupancy derived from the *current*
  scene, preserves locked and other districts' geometry (including a moved
  building and a locked rotated prop), replaces the target district's
  diagnostics, refreshes quarter counts/statistics and keeps IDs unique.

## 2. Policies and constants

| Constant | Value | Purpose |
| --- | --- | --- |
| `EPS` / `FOOTPRINT_TOL` | 1e-6 / 1e-4 | numerical tolerance vs. vertex cleanup |
| `PLACE_CLEARANCE` | 0.5 | visible gap between placed objects |
| `RIVER_BANK_GAP` / `SHORE_SETBACK` | 8 / 1.5 | dry bank / shore setback |
| `WATERFRONT_GAP` | 60 | max bank/shore gap for water-dependent content (tuned: the shipped coastal frame sits 39–56 units from the shoreline) |
| `MIN_BUILD_WIDTH` / `MAX_BUILD_ASPECT` | 2.4 / 6 | building shape policy |
| `TIP_ANGLE` / `TIP_EXTENSION` / `TIP_TRIM` / `MAX_TIP_TRIMS` | 15° / 0.12 / 0.35 / 6 | bounded tip repair |
| `STREET_SETBACK` / `LOT_INSET` | 4.2 / 0.75 | applied once / per lot |
| `MIN_PLAN_WIDTH` | 3.9 | sliver land cleanup in the plan |
| `OPEN_SPACE_FRACTION` / `MIN_OPEN_SPACE` | 0.35 / 250 | planned open space |
| `PROP_MIN_SIZE` / `MAX_PROP_ATTEMPTS` | 4 / 65 | readable floor, bounded attempts |
| `MAX_PLAN_PIECES` | 96 | fragment cap, reported in diagnostics |

Open-space layer decision: all four programs use the existing `area` type
(terrain layer, render order 4, below buildings and roads). `plaza` was left
untouched so other modes are unaffected. Materials: market `sand`, gardens
`grass`, cemetery `hill`, farming `sand`.

`scene.city.generationPolicy` records the active constants in the saved file
(additive, plain JSON, no timing).

Remaining limitations: props are fewer than before because freestanding props
now need real ground (REPRO 83 → 19; 57 requested, 19 placed). Open programs
place detail inside their reservations and absorb most requests (130/130 in the
`prop-fit` fixture); non-open dense quarters leave requests unplaced rather than
packing detail into street gaps, as the guide requires. Waterfront detail needs
unbuilt bank ground, so built-up docks quarters show water-dependent activity
through shipyards/fish markets rather than cranes. Buildings at the existing
16-unit² area floor are kept, per "keep the area floor".

## 3. Before/after evidence (same machine, same predicates)

| Measurement | REPRO before | REPRO after | DENSE before | DENSE after |
| --- | ---: | ---: | ---: | ---: |
| Features / buildings / props | 976 / 801 / 83 | 869 / 738 / 19 | 1956 / 1742 / 123 | 1736 / 1607 / 21 |
| Props intersecting a building | 79 | **0** | 117 | **0** |
| Intersecting prop pairs | 1 | **0** | 5 | **0** |
| Buildings in the river corridor | 5 | **0** | 10 | **0** |
| Buildings on a road corridor | 0 | 0 | 0 | 0 |
| Narrow buildings (width < 2.4) | 0 | 0 | 6 | **0** |
| Fitted aspect > 6 | 2 | **0** | 2 | **0** |
| Shipyards / fish markets | 37 / 39 | 4 / 4 | 29 / 25 | 10 / 4 |
| Water-dependent props away from water | 8 / 10 | **0** | 4 / 5 | **0** |
| Planned open space (count / area) | 0 / 0 | 20 / 22 073 | 0 / 0 | 17 / 19 922 |

Area summary (REPRO / DENSE, local units²): district area 401 506, usable dry
land 281 108 / 281 554, sliver land 9 138 / 9 370, planned open space
22 073 / 19 922, building footprints 165 066 / 152 323. Building placement:
906/1 917 candidates, 738/1 607 accepted, 6/3 repaired (499/118 units²
repaired), 168/310 rejected (44 110/27 245 units²), reasons counted per
district. Props: 57/78 requested, 19/21 placed, 38/57 unplaced (reasons:
`ground`, `buildings`, `props`, `exhausted`).

Diagnostics example (REPRO `f36`, market):

```json
{"revision":0,"waterfront":false,
 "program":{"quarter":"market","unassigned":false,"openSpace":true,"kinds":3,"openSpaces":1},
 "land":{"area":6144.235,"dryArea":4938.296,"sliverArea":0,"pieces":1},
 "limits":{"planCapped":false,"planPieceCap":96,"propAttempts":65},
 "buildings":{"candidates":19,"accepted":9,"repaired":0,"repairedArea":0,"rejected":10,"rejectedArea":2742.337,"reasons":{"reserved":10}},
 "props":{"requested":1,"placed":1,"unplaced":0,"attempts":4,"shrunk":0,"reasons":{"ground":3}}}
```

Performance (warm, five runs): REPRO 76–91 ms vs. 70.8 ms baseline (≈1.1–1.3×),
DENSE 118–122 ms vs. 94.5 ms (≈1.3×); 140 blocks at density 1 / detail 1
≈130 ms. Two profile-driven fixes kept this under the 2× investigation trigger:
AABB pruning with early exit in `waterProximity`, and `dist` using `sqrt`
instead of `Math.hypot` (equivalent at map-unit scales; full suite re-run).

## 4. Tests and commands

```powershell
npm test                                                            # 208 pass / 0 fail
python tests/browser_smoke.py  --output docs/qa-city/browser-smoke  # 30 pass, 0 page errors
python tests/browser_v12.py    --output docs/qa-city/browser-v12    # 23 pass, 0 page errors
node scripts/city-fix-repro.cjs docs/qa-city/after
python scripts/render-city-fix.py docs/qa-city/after
```

- Node: 176 original tests still pass; `tests/city-generation.test.cjs` adds 32
  (geometry oracles with analytical expected values, difference fixtures
  including the 8000-area banks / contained hole / fully covered / capsules /
  bend and end caps / coastline, placement guarantees, shape policy, tip repair,
  roof frame and editor transforms, legacy import preservation, open space,
  waterfront river/coast/no-water, regeneration, 5-seed × layout × envelope ×
  water matrix, and 140-block / 0.5 km / 8 km stress).
- Browser: real `file://` workflows via Playwright/Chromium, no inline
  fallback; the v1.2 run includes the city generation, regeneration and save/
  reload workflows.
- Visual: `docs/qa-city/before|after/*.png` (full maps plus `river-margin`,
  `dock-icons`, `pointed-lots` crops) rendered from the SVGs by Chromium.

`scripts/verify-package.cjs` now reports `package.json`, `src/engine.js`,
`src/render.js`, `src/editor-core.js`, `src/i18n.js` and `tests/v12.test.cjs` as
"modified or corrupted": that is the release manifest detecting the intended
source changes. The manifest was not replaced.

## 5. Reproduce the evidence

REPRO options: `{sizeKm:2.4, shape:'random', shapeGuidance:44, rotation:0,
districts:56, density:0.1, chaos:0.2, quarterDetail:0.5, river:true, walls:true,
coast:false, layout:'organic'}`, seed `silver-vale-42` (DENSE raises density to
0.7, chaos 0.45, quarterDetail 0.7). `docs/qa-city/*/counts.json` holds the
per-variant counts and generation times; `docs/qa-city/before/*.json` and
`after/*.json` are the full saved scenes.

## 6. Compatibility confirmation

- New generation and explicit district regeneration both use the fixed pipeline
  (`generate('city', …)` and the editor's "Regenerate this district" action).
- Loading existing city files does not regenerate, repair, delete or reject
  their saved geometry, including narrow or pointed legacy footprints and the
  shipped v0.1 fixture; old scenes simply lack `roofCx`/`roofCy` and render
  exactly as before.
- `quarters: []`, `buildings: []`, `quarterDetail: 0`, whitelist filtering,
  concave L/T/ribbon envelopes, checked-quarter coverage, other map modes,
  offline runtime and GPL/provenance notices are unchanged.
- To apply the fix to an old map, generate a new city or regenerate individual
  districts; existing saved geometry is preserved until then.
