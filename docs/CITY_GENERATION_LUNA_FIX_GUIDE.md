# Luna handoff: repair Megamap city generation

Prepared 2026-09-17 against the local Megamap 1.2.0 source. This is an implementation guide, not a report that the fixes have already been made.

## 1. Your assignment

Fix the generated-city defects described below, verify the result numerically and visually, and deliver the working source changes with regression tests and before/after evidence. Work through the whole guide. Fixing only prop overlap is not completion.

The user supplied an annotated screenshot showing long pointed building footprints, large unexplained gaps, and oversized-looking detail symbols overlapping the urban fabric. The screenshot shows an Italian interface, city **Lowgate**, seed **`silver-vale-42`**, **2.4 × 2.4 km**, **978 objects / 800 buildings**, **Organic/random** outline, **guidance 44**, **rotation 0**, and **724%** zoom. Several red marks identify examples; their exact correspondence to feature IDs is not established.

You do not need the earlier conversation or screenshot to proceed. The reproducer in section 4 recreates these defect classes. The screenshot's complete saved scene and settings are unavailable, so do not spend the task trying to force an exact 978/800 match.

Project root on the author's machine:

```text
C:\Users\alexo\Desktop\Quickdir\Megamap
```

The user referred to `docs\CITY\_GENERATION\_ISSUES.md`. That path does not exist in this checkout. The actual source audit is **`docs/CITY_GENERATION_ISSUES.md`**. It contains useful observations but also incorrect proposed fixes and misleading measurements. This guide incorporates the relevant findings and explicitly corrects them. Treat that audit as evidence to evaluate, not instructions to copy blindly.

Deliver source fixes, not a replacement application, new online service, or cosmetic screenshot patch. Preserve the existing offline browser workflow and editable saved-map format. This workspace was not a Git repository when inspected; do not assume Git history or a branch is available. Inspect the current files and any applicable project instructions before editing.

## 2. Project orientation

Megamap is a plain JavaScript/SVG map generator and editor for campaign regions, local landscapes, cities, and battle maps. Users open `index.html` or `START_MEGAMAP.bat`. There is no runtime build step or network dependency. The UMD modules also load through Node's `require()`.

| File | Relevant responsibility |
| --- | --- |
| `src/engine.js` | Geometry, seeded generation, quarter programs, building types, district regeneration, scene validation. Main implementation target. |
| `src/render.js` | SVG generation, roof clipping, point-symbol rendering, layer ordering. |
| `src/assets.js` | Asset catalog and vector symbol bodies. This file has very long lines; inspect selected assets through `require()` rather than dumping entire matching lines. |
| `src/editor-core.js` | Appearance defaults, atlas loading, transforms, undo history and export helpers. |
| `src/app.js` | Browser controls, district-regeneration action, status messages, save/export. |
| `src/i18n.js` | UI translations; use the existing mechanism for any new user-facing messages. |
| `tests/engine.test.cjs`, `tests/v1.test.cjs`, `tests/v12.test.cjs` | Current Node regression suite. |
| `tests/browser_smoke.py`, `tests/browser_v12.py` | Playwright UI/export workflows. |
| `docs/ARCHITECTURE.md`, `README.md`, `UPGRADING.md` | Existing behavior and compatibility contracts. |
| `vendor/watabou/` | Provenance of the adapted parcel subdivision; retain attribution. |

Run developer commands from the project root. Node **22.14.0** was available during preparation. Python and Playwright were also available, and Chromium successfully rasterized the reproduction SVGs. No package installation is required for the Node tests.

Important data conventions:

- City maps use a **1000 × 1000 local-unit** coordinate system; `scene.scale` is map width in kilometres. At 2.4 km, **1 local unit = 2.4 metres**. Existing geometry thresholds are mostly schematic local units, not physical metres.
- A scene contains `features`, `options`, and optional `city` metadata. File schema remains `version: 1`; source reports `engineVersion: '1.2.0'`.
- A district has `type: 'district'`, `polygon`, `quarter` (program ID), and `ward` (human-readable program name). A **child** building/prop uses `ward: district.id`. Do not confuse these two meanings of `ward`.
- Buildings have `polygon`, `x/y`, `buildingKind`, and roof metadata. They **do not have `size`**. Quarter props are point features with `type: 'decoration'`, `quarterProp: true`, `asset`, `x/y`, `size`, and `rotation`.
- `add()` assigns unique feature IDs using a scene-local `WeakMap` counter, with an existing-ID scan for loaded scenes. Continue using it; do not invent IDs from `features.length`.
- `center(poly)` is the arithmetic mean of vertices, not an area centroid, and can be outside a concave polygon. `polygonInterior()` obtains an interior point. Most geometry helpers assume simple polygons; some specifically require convex polygons.
- `options()` respects explicit empty `quarters` and `buildings` arrays. The apparent empty default building array near the top of `engine.js` is populated later from `BUILDING_TYPES`.

## 3. Existing pipeline and the defects it creates

Use function names as navigation anchors. The following line numbers describe the source inspected for this guide and will move after edits.

1. `generate('city', seed, config)` dispatches to `guidedCity()` around `engine.js:286`.
2. `cityEnvelope()` around line 203 constructs the guided outline. Its own random stream is `rng(seed + '-outline')`. Shape, guidance, rotation, **and coast mode** can influence the outline. For the `random` shape, guidance does not change its radial formula.
3. River/water features are created near lines 290–291. The city river has width **36** and 101 points. The coastal-water polygon has a varying shoreline near x=780; it is not exactly the line x=780.
4. Sites become Voronoi cells; cells are clipped to the envelope, with triangulation fragments rejoined. District polygons tile the outline; water is **not** removed from these logical district polygons.
5. Quarter assignment near lines 316–327 gives each selected program at least one fragment. Only the initially assigned docks program uses a water-distance score. Random assignments for remaining fragments can put more docks anywhere.
6. `populateQuarter()` around lines 254–277 runs once per district. For each convex part it insets by 4.2, runs `createAlleys()`, insets each lot by 0.75, checks area and sampled points against water/locked polygons, and creates buildings. It then immediately places props for that part.
7. Walls, towers, gates and approach roads are added **after** district contents, near lines 330–340. Bridge roads/assets are added near lines 341–347. The bridge code removes some buildings with center/vertex tests; it does not remove overlapping props.
8. Population and city statistics are computed at the end.

This ordering matters: a prop cannot avoid a road that has not been planned yet. A prop placed in an earlier part or district can also be overlapped by later buildings, because building placement does not reserve existing prop footprints.

Rendering facts:

- `render.js:119`, `icon()`: a normal point symbol uses a **2 × size** square centered on x/y, then applies rotation.
- Symbols have `viewBox="-28 -28 56 56"`; roof symbols use `preserveAspectRatio="none"`, while normal symbols preserve their proportions.
- Buildings render at order 5, roads 6, walls 7, decorations 8, and assets 9. Props therefore visibly cover roofs when placement is wrong.
- Roof art is clipped to the building polygon. A boat drawing inside a roof is different from a freestanding boat/dock detail overlapping a roof.
- District outlines/fills are disabled by default. Land left empty without an actual plaza/garden feature looks like the land outside the city.
- Most internal streets are **gaps between parcels**, not `road` features. Checking only explicit roads will not protect every street-shaped gap.

## 4. Reproduce and save a baseline before editing

Create `scripts/city-fix-repro.cjs` with the following content. This is a development/evidence script; it does not change the runtime. Run it before making fixes, and retain the output for comparison.

```js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require('../src/engine.js');
const R = require('../src/render.js');
const output = path.resolve(process.argv[2] || 'docs/qa-city/before');
fs.mkdirSync(output, {recursive: true});

const REPRO = {
  sizeKm: 2.4, shape: 'random', shapeGuidance: 44, rotation: 0,
  districts: 56, density: 0.1, chaos: 0.2, quarterDetail: 0.5,
  river: true, walls: true, coast: false, layout: 'organic'
};
const variants = {
  repro: REPRO,
  dense: {...REPRO, districts: 55, density: 0.7, chaos: 0.45,
          quarterDetail: 0.7},
  dry: {...REPRO, river: false},
  coast: {...REPRO, river: false, coast: true}
};
const crops = {
  'river-margin': '430 695 200 200',
  'dock-icons': '368 232 90 60',
  'pointed-lots': '129 366 90 60'
};
const summaries = {};
for (const [name, options] of Object.entries(variants)) {
  const started = performance.now();
  const scene = E.generate('city', 'silver-vale-42', options);
  const generationMs = performance.now() - started;
  E.validateScene(JSON.parse(JSON.stringify(scene)));
  fs.writeFileSync(path.join(output, `${name}.json`),
                  JSON.stringify(scene, null, 2));
  fs.writeFileSync(path.join(output, `${name}.svg`), R.render(scene));
  if (name === 'repro') {
    for (const [crop, viewBox] of Object.entries(crops)) {
      fs.writeFileSync(path.join(output, `${crop}.svg`), R.render(scene, {
        viewBox, furniture: false, layers: {labels: false}
      }));
    }
  }
  summaries[name] = {
    generationMs,
    features: scene.features.length,
    districts: scene.features.filter(f => f.type === 'district').length,
    buildings: scene.features.filter(f => f.type === 'building').length,
    props: scene.features.filter(f => f.quarterProp).length
  };
}
fs.writeFileSync(path.join(output, 'counts.json'),
                JSON.stringify(summaries, null, 2));
console.log(JSON.stringify(summaries, null, 2));
```

```powershell
Set-Location 'C:\Users\alexo\Desktop\Quickdir\Megamap'
node scripts/city-fix-repro.cjs docs/qa-city/before
node --test tests/engine.test.cjs tests/v1.test.cjs tests/v12.test.cjs
```

After implementation, use `docs/qa-city/after` as the output directory. Open the SVGs in a browser and capture matching full-map and close-up PNGs. A usable optional rasterization script is:

```python
# Save as scripts/render-city-fix.py; usage:
# python scripts/render-city-fix.py docs/qa-city/before
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

folder = Path(sys.argv[1]).resolve()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1050, "height": 1050})
    for svg in sorted(folder.glob("*.svg")):
        page.goto(svg.as_uri(), wait_until="load")
        page.screenshot(path=str(svg.with_suffix(".png")))
    browser.close()
```

If browser navigation or Chromium is unavailable on your machine, report that limitation and use the existing supported test harness where possible. Do not claim that inspecting SVG text alone is visual verification.

### Baseline independently checked during guide preparation

The **176 existing Node tests passed**. REPRO and DENSE counts and the measurements below were recomputed from the current source. The overlap counts use the original audit's strict-crossing/vertex-containment test, so they are comparable historical measurements, **not** a recommended complete collision predicate.

| Measurement | REPRO | DENSE |
| --- | ---: | ---: |
| Features | 976 | 1956 |
| Buildings | 801 | 1742 |
| Districts | 56 | 55 |
| Quarter props | 83 | 123 |
| Props whose square footprint intersects a building | 79 | 117 |
| Intersecting prop pairs | 1 | 5 |
| Intersecting building pairs found by that test | 0 | 0 |
| Audit heuristic: longest edge >8 and shortest edge <3 | 93 | 257 |
| Actual convex minimum width <2.4 | 0 | 6 |
| Heuristic-flagged buildings that still pass minimum width >=2.4 | 93 | 252 |
| Longest-edge roof-frame aspect ratio >6 | 2 | 2 |

The default city guidance is 65, but both REPRO and the DENSE variant above explicitly use 44. Do not inadvertently mix defaults with these comparisons.

### Corrections to the original audit

These corrections are essential to avoid implementing a plausible-looking but ineffective fix:

1. **Its I3 river-subtraction snippet is wrong.** `clip(poly, n, c)` keeps `dot(n, point) <= c`. The two half-plane clips in that snippet retain a strip **inside** the river corridor. Repeating that for a curved river intersects infinite strips. It neither subtracts finite river segments nor preserves the land on both banks. Do not paste it.
2. **Shortest edge is not building width.** REPRO building `f232` has a 0.0807-unit edge and a 25.5725-unit edge, but its minimum width is **11.9572**, and its roof frame is approximately **25.6144 × 11.9572**, aspect **2.1422**. It is a pointed polygon with a tiny closing edge, not a 317:1 needle. A width >=2.4 guard alone fixes none of the 93 REPRO heuristic hits. Treat pointed tips, redundant vertices, true narrowness, and stretched roof art as related but distinct problems.
3. **The reported largest empty radius is not a valid dry-land target.** REPRO point `(528,796)` is about **20.79** units from the river centerline, inside the proposed 26-unit exclusion band, and only **1.93** units from the city boundary. Measuring distance to buildings there does not demonstrate a missing buildable city block. In district `f37`, a 0.5-unit sample grid estimates only **2126.25 / 7227.14 square units (~29.4%)** outside the 26-unit river band, before setbacks; its five existing buildings occupy ~1075.40 square units. Therefore, do not require this district to become densely filled or its historical free-radius value to hit 25–30.
4. **The shield/leaf-shaped symbol is consistent with `dry-dock`.** That asset draws a dock outline around a boat without crossbars. `roof-shipyard` has a shed and a boat with crossbars. In REPRO, a separate `dry-dock` prop `f480` lies at approximately `(433.54,264.66)`, near shipyard building `f477` at `(436.24,255.66)`. The recreated icon crop shows the freestanding symbol over the building fabric. The original screenshot's exact IDs cannot be proven. Fix both placement classes; do not assume the marked symbol is solely a roof.
5. **Center plus corners is not a complete collision test.** Intersections can occur through crossing edges without either polygon containing a vertex. Collinear overlap, tangency, and containment require explicit handling.
6. **Changing draw order hides symptoms but does not fix placement.** Likewise, switching on all district labels/fills does not create intentional parks.
7. **Do not tighten legacy import rules to reject old narrow buildings.** These are new-generation quality constraints. Loading a saved atlas must keep its geometry, including old defects, until explicit regeneration.
8. **Do not require counts to remain within a few percent or all quarter densities to differ by <3×.** Those proposed acceptance rules conflict with removing invalid geometry and preserving intentional gardens/cemeteries. Measure useful occupied area and deliberate open space instead.
9. **Do not globally prohibit inland warehouses.** Warehouses also belong to merchants/industrial programs. Apply waterfront requirements to genuinely water-dependent kinds/props, not their whole visual category.

## 5. Required behavior after the fix

| Issue | Required outcome |
| --- | --- |
| I1: props over buildings | Full generated prop footprints avoid all generated/retained building footprints, including different districts. Props remain present when valid space exists. |
| I2: pointed/sliver buildings | Remove degenerate geometry and pathological thin spikes; repair or replace poor footprints where possible rather than creating large new holes. Ordinary irregular buildings and broad triangles can remain. |
| I3: water-related lost land | Subdivide the actual dry buildable remainder; use full-geometry water exclusion. Preserve land on both banks where available. Do not fill riverbanks or outside-city land to satisfy an invalid hole metric. |
| I4: unexplained open quarters | Gardens, markets, necropolises and farmsteads receive coherent, identifiable open spaces, visible with district overlays off. Maintain their distinct programs. |
| I5: inland waterfront activity | Prefer real waterfront fragments for docks and constrain shipyards/dry docks/cranes/fishing activity by actual water geometry. Provide deterministic, whitelist-safe behavior when water or waterfront capacity is absent. |
| I6: prop/road collisions and silent loss | Reserve infrastructure before content placement, prevent cross-district prop collisions, and record useful bounded placement diagnostics. |
| Regeneration | The same guarantees apply to newly generated contents during district regeneration, while other districts and locked objects remain unchanged. |

## 6. Implement in this order

### Step A — Establish geometry helpers and adversarial tests

Put reusable helpers near the existing geometry functions in `engine.js`, or in a small local module if there is a clear benefit. Maintain both Node and direct-browser loading if adding a module. Avoid introducing a CDN, runtime package installation, or a bundler.

Use clear contracts for:

- Segment intersection/distance, including endpoint contact, collinear overlap and zero-length segments.
- Polygon intersection and minimum separation, including complete containment and edge-only crossing.
- Polygon containment inside a concave boundary; vertex-only tests are insufficient when an edge crosses a concavity.
- Polygon versus finite polyline corridor, including bends and end caps.
- Transformed point-symbol footprints: start with the symbol's centered square, rotate its corners by `rotation`, and apply any relevant reflection. Add a documented small clearance for visible strokes/rounding.
- Convex polygon quality: finite vertices, no self-crossing, positive area, minimum support width, fitted aspect, and a pointed-tip measure.

Separate numerical tolerance (for example `1e-6` local units, consistently applied) from visible placement clearance (for example 0.5 local units). AABB bounds are a cheap early-out, not the final geometric test. Boundary contact can be accepted for adjacent land pieces but should fail clearance checks for object placement. State that distinction in helper names/tests.

Do not use the audit's ~10-line overlap function as the production implementation: its strict orientation products omit boundary cases. Do not use `inside()` alone as a clearance predicate.

Write small analytical tests first: crossed thin rectangles with no contained vertices, one polygon wholly inside another, collinear overlapping edges, tangent shapes, repeated points, a square rotated 45 degrees, and a polygon whose edge crosses the notch of an L-shaped boundary.

### Step B — Plan infrastructure and split generation into phases

Refactor enough of `guidedCity()` / `populateQuarter()` to make the following order explicit:

1. Create the outline and water geometry.
2. Plan gate approaches, bridge roads, walls, and the spatial reservations for their symbols. Existing valid bridge/road geometry may be retained, but its occupied corridors must be known before lots/props are placed.
3. Assign district programs and plan dry buildable pieces plus explicit open-space reservations.
4. Place **all buildings** across all districts using those plans.
5. Place **all quarter props** against the complete occupancy set.
6. Finalize diagnostics, population, and statistics.

You can plan reservations before emitting features if preserving feature ordering simplifies the change. Correctness must not depend on an object happening to appear earlier in `s.features`. Keep distinct deterministic per-district streams for planning/buildings/props where useful, based on the scene seed and district identity; use the district revision during regeneration. No `Math.random()` or timing-dependent geometry.

Explicit road reservations should include their visible outer stroke: the renderer draws width `f.width + 1.2` under the inner road. Use the corridor half-width plus chosen clearance. Water/bridge crossings are intentional infrastructure exceptions, not permission for ordinary buildings/props to occupy water. Reserve tower/gate/bridge symbol footprints against props where relevant; do not mistakenly treat intentional bridge-over-river or wall-tower overlaps as a global failure.

Keep internal street gaps usable. Prefer dedicated open spaces and valid interior court/yard remnants for props. Do not solve reduced prop placement by packing all rejected props into narrow inter-building passages.

During district regeneration, derive reservations from the **current** scene so moved or edited roads are respected. Do not create duplicate gates/bridges or rebuild other districts.

### Step C — Compute dry land with real polygon difference (I3)

Keep logical district polygons unchanged: existing tests assert that their total area covers the city envelope. Water clipping belongs in the district's temporary buildable-land plan.

Use a consistent water-clearance policy. A reasonable starting river obstacle is the finite polyline buffered by `river.width / 2 + 8` (26 units for the present river). Use one named constant/policy rather than incompatible center/vertex thresholds of 24, 26 and 29. Account for coastal polygon water too. Recompute these exclusions for regeneration against current features.

A dependency-free approach fits the existing convex helpers:

1. Obtain the current inset district parts. Apply the existing district street setback once, **before** subtracting water/infrastructure. Do not apply a fresh 4.2-unit street setback to every fragment produced by subtraction; that creates artificial seams and additional holes.
2. Represent each finite buffered river segment by a convex capsule or a conservatively circumscribed polygon. Cover bends and endpoint caps; an infinite strip is not a segment buffer. If approximating circular caps, the approximation must contain the circle, with a measured small error, so gaps cannot admit buildings.
3. Represent polygonal coastal water by convex pieces using the existing decomposition. Add a documented shore setback if required; keep that separate from waterfront-distance limits.
4. Subtract each convex obstacle from **every surviving convex land piece**, retaining all exterior pieces. Sequential subtraction removes the union of overlapping obstacles without requiring a single polygon with holes.
5. Clean tiny numerical fragments and merge truly adjacent pieces where doing so stays convex and does not add obstacle area. Subdivide the surviving dry pieces with `createAlleys()` and recheck accepted building footprints against exact corridor distance/water polygons.

The following reference algorithm explains the **difference**, using existing `clip()` semantics. It is conceptual implementation guidance: add tolerances, cleaning, trivial-intersection early-outs, and tests before production use.

```js
// subject and obstacle are convex, with clean, positive signed-area winding.
// Each obstacle edge describes its interior as dot(n, point) <= c.
function subtractConvex(subject, obstacle) {
  let remainder = subject;
  const outsidePieces = [];
  for (let i = 0; i < obstacle.length && remainder.length >= 3; i++) {
    const a = obstacle[i];
    const b = obstacle[(i + 1) % obstacle.length];
    const n = [b[1] - a[1], a[0] - b[0]];
    const c = n[0] * a[0] + n[1] * a[1];
    // This slice violates this obstacle half-plane, so it is dry.
    const outside = clip(remainder, [-n[0], -n[1]], -c);
    if (outside.length >= 3 && area(outside) > AREA_EPS) {
      outsidePieces.push(cleanPolygon(outside));
    }
    // Only this remainder could still lie inside the entire obstacle.
    remainder = clip(remainder, n, c);
  }
  // The final remainder is subject intersect obstacle: discard it.
  return outsidePieces;
}
```

For multiple obstacles, repeatedly replace the land-piece list with the flat-mapped result of this difference. Skip obstacles whose bounds or actual intersection show they cannot affect a piece. Cache obstacle geometry per generation/regeneration. Bound fragment growth and report capacity limits; never silently replace real subtraction with deletion of a whole district.

Analytical acceptance fixture: subtract the rectangle `x=40..60, y=-10..110` from the square `0..100, 0..100`. Retained area must be **8000**, with usable land on both sides and no retained area in the vertical strip. Also test a contained obstacle (a hole represented by multiple exterior pieces), a nonintersecting obstacle, fully covered land, overlapping capsules, a river bend, endpoint caps, and a coastline.

### Step D — Improve building geometry without mass deletion (I2)

Keep the area floor and add actual geometric quality checks. Work on the **post-inset footprint**, where tiny edges/tips arise, then recompute roof dimensions from the final geometry.

Use a combination rather than the audit's shortest-edge ratio:

1. Remove duplicate/nearly duplicate and redundant collinear vertices within a defined tolerance, without expanding a building outside its allowed land.
2. Measure actual minimum support width for convex polygons. For each nonzero edge, find the maximum perpendicular distance to all vertices; the minimum of those values is the width. A **2.4-unit** starting threshold is reasonable, but by itself does not address the visible long tips.
3. Measure aspect ratio in the fitted roof frame or a minimum-area oriented rectangle. A starting maximum near **6** can catch true needles; explain any tuning from the visual matrix.
4. Detect and trim unreasonably acute, extended tips. A candidate policy is to bevel corners below roughly **15 degrees** when the adjoining sides form a visibly extended spike, using a width/length measure as well as angle. Keep the result contained in the original lot and simple/convex. Do not reject every triangle or every short edge.
5. If a substantial lot still fails, try a bounded deterministic repair: a feasible inset/contained footprint, different subdivision, or safe merge/repartition with a neighboring lot. Recheck water, roads, other buildings and protected features. If it truly cannot support a building, record the reason and retain it as a small intentional setback/open remnant.

Treat the numeric defaults above as initial design choices, **not measurements proving quality**. The final policy must be named, documented, tested and visually justified. The old `maxEdge > 8 && minEdge < 3` count can remain in a comparison report, but is not a requirement to reach zero.

Inspect `fitRoof()` and building rendering together. The current fit measures local min/max extents but positions the symbol around the mean-of-vertices center. For asymmetric polygons, that can miscenter the art within its measured frame. If this contributes to the visual defect, either correct the fitted center with additive, backward-compatible metadata (and update translate/rotate/scale behavior), or use a centered fitting method that needs no new serialized center. Keep the clip path on the final building polygon. Do not distort a prop into a roof or remove all roof detail to hide bad geometry.

New-generation quality rules must not be added as hard rejection rules for existing imported buildings. Keep schema compatibility and test the old fixture.

### Step E — Plan meaningful open space (I4)

Currently `open = ['gardens','cemetery','market','farming']` selects a **0.38** independent terminal-lot drop probability, versus **0.065** elsewhere. This is not a reservation for a coherent park or square. Temple and noble have large lot-size factors but are **not** in the `open` list.

Replace the open-quarter coin-flip approach with explicit reserved space, then subdivide the remaining buildable ground. A practical implementation is one compact open-space reservation per substantial dry component, selected deterministically near an interior point and grown/merged across adjacent candidate lots to a target area. Starting around **30–40% of usable dry land** preserves the intent of the old setting, but target area is different from a probability per lot. Clip reservations away from roads/water/protected objects; a river splitting a quarter may require separate components.

Make the reservations actual editable features with `ward: d.id` and a clear generated-open-space flag/purpose, using existing polygon types where possible:

- Market: a plaza/court with stalls placed inside valid space.
- Gardens: planted/grass area with appropriate garden details.
- Necropolis (`cemetery`): a cemetery ground area with grave/memorial details.
- Farmsteads (`farming`): field/orchard/courtyard areas around permitted farm buildings.

The area should remain legible when district overlays and labels are off. `quarterDetail: 0` must still suppress **all quarter props**, while the planned ground surface may remain. Detail density controls decoration quantity, not whether city land exists.

Prefer existing `area`/`plaza` types to expanding the file schema. Check `render.js:layer()`: `area` maps to terrain, but `plaza` currently falls through to the assets layer. Decide and test the intended open-space layer explicitly. Avoid affecting plazas in other modes unintentionally. Rendering order must not paint reserved surfaces over water/roads; geometry exclusion remains mandatory.

Do not turn on the district planning overlay by default as the primary fix. Do not make every quarter equally dense. `quarters: []` must stay an unassigned blank district plan; `buildings: []` must produce no buildings while allowing appropriate open-space detail.

### Step F — Make waterfront assignment and content eligibility explicit (I5)

Define water proximity using actual river banks and actual water-polygon shoreline, not distance to x=780 or solely to a district's center. Distance to a river bank is based on finite segment/capsule geometry; polygonal water distance is to its boundary. A footprint must also pass the independent dry-land exclusion test: being near water does not authorize overlapping water.

Use one documented placement policy. A reasonable starting **maximum bank/shore gap of 40 local units** for water-dependent activity accommodates the existing coastal frame (which can stop tens of units short of the shoreline), while eliminating the hundreds-of-units inland cases. Measure from the actual building/prop footprint to water and ensure the candidate has usable dry land. Tune if evidence calls for it; do not scatter unrelated magic distances through code.

Quarter assignment:

1. Precompute each fragment's usable waterfront opportunity, not just center distance.
2. Assign the required docks program to the best eligible fragment before less constrained programs consume all waterfront candidates. Still allocate every selected program at least once, and never introduce unchecked programs.
3. For optional repeated assignments, remove docks from the candidate program pool for ineligible fragments when alternative selected programs exist. Do this **before creating district features**; the audit's suggestion to re-pick another fragment while iterating can double-assign or skip fragments.
4. If docks is the only selected program, inland fragments can remain docks-labeled inland storage quarters with restricted contents. Do not substitute an unchecked quarter to make the algorithm convenient.
5. If no eligible waterfront exists, retain the required docks program as inland storage with an explicit diagnostic. Do not invent a river or change the user's settings.

Content eligibility:

- Require nearby water for **`shipyard`**, **`fishmarket`** (as this repair's explicit policy), and props **`dry-dock`**, **`dock-crane`**, **`fishing-racks`**.
- Allow **`warehouse`**, taverns, and **`cargo-yard`** inland. Keep warehouses usable in merchants/industrial quarters.
- Filter the compatible building pool **per candidate lot** before selection. The final pool is quarter-compatible kinds intersected with the user's whitelist intersected with spatial eligibility.
- If that pool is empty, reserve/skip with a diagnostic. Never silently add a house/warehouse that is not whitelisted. Example: `quarters:['docks'], buildings:['shipyard'], river:false, coast:false` should generate no shipyards, not inland shipyards or unrequested warehouses.
- Apply the same eligibility filtering to props. An inland docks quarter can contain cargo handling/storage props, but no water-dependent dock/crane/boat detail.
- Update the current no-water warning, which explicitly promises an inland “dry-dock” district and will be inaccurate after this change.

Re-run the asset-variety regression: the existing `roof-variety` helper disables the river by default. If a test is intended to exercise every water-dependent roof, give that fixture water. Do not weaken variety assertions merely because their old dry fixture relied on incorrect behavior.

### Step G — Place props with complete occupancy checks (I1, I6)

Once all buildings and infrastructure reservations exist, place props using full transformed footprints and a small visible clearance. Check:

1. Complete containment in the intended allowed ground/reservation and city boundary, including edges across concavities.
2. No intersection with buffered river/water obstacles.
3. No intersection with **any** building, regardless of `ward`.
4. No intersection with any already placed quarter prop, regardless of `ward`.
5. No intersection with explicit road corridors or protected wall/tower/gate/bridge footprints as applicable.
6. No collision with retained protected objects during regeneration.

Use 65 attempts per requested prop as the existing upper bound, or another documented bounded strategy. If large assets cannot fit, prefer a sensible bounded size/position adjustment inside a real open reservation; do not shrink them into unreadable dots or silently set detail to zero. Skip when constraints truly cannot be met, and count the failure.

Build an occupancy index or at least cached AABBs if needed. Generation currently takes roughly tens of milliseconds for the reproduction on the author's machine; avoid scanning every river segment against every feature for every failed trial without early-outs. Timing belongs in measured QA, not deterministic scene metadata.

## 7. District regeneration, diagnostics and compatibility

`regenerateDistrict(s, id, quarter)` currently increments `revision`, removes unlocked children with the target ward ID, and calls `populateQuarter()`. The UI wraps this action in an undo snapshot and validates afterward. Preserve that workflow.

Required regeneration behavior:

- Leave all other districts and their children unchanged, including IDs, notes and geometry.
- Leave all locked target children unchanged, including locked props and any newly introduced open-space features.
- Treat relevant retained geometry as occupied, including another district's manually moved building inside the target. Do not treat a logical district polygon as a solid obstacle just because it is locked.
- Handle point-symbol obstacles as well as polygons and paths. The old locked-polygon-only check misses locked props and edge-only polygon intersections.
- Recreate only unlocked target contents, using current water/road geometry, the chosen program, the building whitelist and the same quality rules as initial generation.
- Locked old geometry can already violate the new constraints. Preserve it, report it separately if useful, and make new contents avoid it. Do not delete or move it to make a global zero-overlap test pass.
- Keep imported-scene regeneration functional if old optional city/diagnostic fields are absent. Feature IDs must remain globally unique across repeated regeneration and save/load cycles.

Add structured deterministic diagnostics, for example a bounded `scene.city.generationDiagnostics` object keyed by district ID. Keep it additive, plain JSON, and optional. At minimum record:

| Category | Useful values |
| --- | --- |
| Land | District area, dry buildable area, planned open-space area. Use documented stages so setbacks are not mistaken for missing area. |
| Buildings | Candidate/accepted counts; rejection or repair counts by water, infrastructure, protected geometry, poor shape, no compatible eligible kind. |
| Props | Requested, placed, unplaced, and counts of failed attempts by reason. `requested = placed + unplaced`; attempt counts are separate. |
| Program constraints | Missing waterfront capacity; no compatible whitelist entries; explicit empty selection. |
| Limits | Any recursion/fragment/attempt cap that prevented a requested placement. |

Distinguish intentional emptiness (unassigned district, empty whitelist, planned park, all-water parcel, preserved locked content) from unexpectedly unused buildable land. Do not report every empty garden as an error or append a warning per failed attempt. Replace a target district's diagnostics on regeneration instead of accumulating stale warnings forever.

`scene.city.warnings` currently stores a few plain strings. `src/app.js` already combines these with metadata warnings, translates them through `I.t()`, and displays them in **`#mapWarnings`** (around line 97). Reuse that existing surface for concise actionable summaries; keep detailed per-district counters in structured metadata and, only if useful, the inspector. Do not build a new warning system or large debugging dashboard. Use the existing translation mechanism for UI additions.

Refresh derived generation summaries when a generation/regeneration operation completes: population, program counts, building count/type count and diagnostic summaries should agree with final features. The project does not promise live statistics after every manual edit; do not expand this into a general reactive accounting system.

Compatibility limits:

- Loading existing city files must not regenerate, repair, delete, or reject their valid saved geometry because it fails new aesthetics rules.
- Keep `quarters: []`, `buildings: []`, detail zero, checked-quarter coverage, whitelist filtering, and independent shape/layout controls.
- Preserve concave L/T outlines and current envelope tiling. Do not change the envelope into a hull to simplify clipping.
- Preserve other map modes. Shared changes to `createAlleys`, rendering layers or geometry helpers need the complete existing regression suite.
- Retain GPL/provenance notices and offline CSP/runtime behavior.
- Do not regenerate all examples/assets or rewrite historical release reports unless your final change actually requires it. `scripts/verify-package.cjs` checks original release hashes; expected source edits invalidate those hashes. Do not misreport that as a new engine defect or replace the manifest merely to make it green.

## 8. Regression tests and visual acceptance

Add focused tests, preferably `tests/city-generation.test.cjs`, and include that file in `package.json`'s `test` command. A bare `npm test` currently names three files explicitly; a new file is otherwise not run automatically.

### Geometry and scene tests

1. **Geometry predicates:** the adversarial fixtures in Step A and difference/area fixtures in Step C. Analytical expected coordinates/areas should provide an oracle independent of the production helper.
2. **Props:** on REPRO, DENSE, and at least one high-detail fixture, zero new prop/building intersections, zero new prop/prop intersections across all wards, and zero prop/road or prop/water intersections. Also require successful nonzero prop placement in a fixture deliberately providing room; disabling all props must fail this test.
3. **Buildings:** finite simple positive-area polygons, complete allowed-land/envelope containment, no pairwise overlap, no full-polygon water/road collisions, and compliance with the chosen shape-quality policy. Report repaired/rejected area, not just feature count. Do not reuse the old shortest-edge heuristic as the acceptance oracle.
4. **Water:** a synthetic divided district with substantial dry land on both banks must retain/populate both sides when compatible kinds exist. Include a river bend whose corridor crosses a building interior even though center/vertices are dry. Use coastal water too.
5. **Open quarters:** explicit coherent surface reservations for each open program when sufficient dry area exists; buildings avoid their reserved interiors; props can occupy their intended reservations. With detail zero, no `quarterProp` remains and the ground reservation still renders with district overlays off.
6. **Waterfront:** river-only, coast-only, both, and no-water cases; docks-only selection; docks plus other programs; a shipyard-only whitelist with no water; warehouses allowed inland; per-lot and per-prop eligibility. No unchecked program/type may appear to satisfy a fallback.
7. **Regeneration:** preserve locked buildings, locked rotated props, locked open-space features and every other district. Add a retained moved building and an edited road crossing the target. Verify all newly placed contents avoid them, repeated regeneration has unique IDs, and diagnostics replace stale target entries.
8. **Determinism and persistence:** identical scene seed/options produce deeply equal output within the changed engine; the same cloned scene and regeneration operation produce equal results. Validate, serialize, reload and render; old fixture geometry remains unchanged. No elapsed times or nondeterministic diagnostics in saved output.
9. **Selection semantics:** all selected quarters represented, disabled quarters excluded, explicit empty arrays honored, whitelist obeyed, no props at detail zero.
10. **Roof/edit/export:** textures on/off; clipping; building rotate/scale/translate, including any new fit-center data; style/layer toggles; SVG and PNG export. No `NaN`, `Infinity`, missing symbols, duplicate SVG IDs, or unhandled browser errors.

Separate inherited locked-object violations from violations introduced by the operation. Collision tests should inspect geometry rather than relying only on absence of visibly overlapping pixels or the exact historical feature IDs.

### Manageable coverage matrix

Do not run an enormous Cartesian product. Use a small deterministic matrix covering these cases, then preserve any newly discovered failure as a focused fixture:

| Dimension | Required coverage |
| --- | --- |
| Seeds | `silver-vale-42` and at least four fixed additional seeds |
| Density/detail | REPRO, DENSE, density 1/detail 1, detail 0 |
| Layout | Organic, planned, radial |
| Envelope | Random, square, L, T, ribbon; exact and intermediate guidance; rotated concave case |
| Water | River only, coast only, both, neither |
| Programs | Default set, all 15, docks only, each open quarter, empty quarters, empty/incompatible building whitelists |
| Stress | One case at 140 blocks and high density/detail; map scales 0.5 and 8 km to check stated scale semantics |
| Editing | Initial generation, regeneration, loaded legacy scene, retained locked/manual geometry |

Use the full existing suite for broader shape/mode coverage. Record generation time and output/fragment counts for baseline and after on the same machine. If time rises materially (roughly >2× is a useful investigation trigger), profile and explain it; it is not a hardware-independent pass/fail threshold. All loops and retries must remain bounded and the browser must remain usable at maximum settings.

### Measure holes on the correct domain

For I3/I4, compare **usable dry ground**, after explicit water/road/protected exclusions and intentional open reservations. A sampled empty-space analysis should:

- Restrict candidate centers to unreserved buildable land.
- Bound any reported empty disk by the distance to the buildable-domain boundary, not just the nearest building.
- Distinguish intentional parks/setbacks from unexplained loss.
- Report usable area, building footprint area, planned open-space area, and rejected/repaired area per program/district.

Do not set a universal coverage percentage across market, gardens, noble, docks and commons. Show that the synthetic large-dry-remainder fixture succeeds and explain large residual gaps in the real seeds. This is stronger evidence than insisting old district `f37` gain buildings regardless of its available land.

### Browser and visual review

Run the shipped workflows with new output directories:

```powershell
npm test
python tests/browser_smoke.py --output docs/qa-city/browser-smoke
python tests/browser_v12.py --output docs/qa-city/browser-v12
node scripts/city-fix-repro.cjs docs/qa-city/after
python scripts/render-city-fix.py docs/qa-city/after
```

If normal file navigation is blocked, retry the appropriate workflow with `--inline` and clearly record that it removes CSP and does not validate actual `file://` navigation, launcher execution or browser-restart storage. If using `--chromium`, supply a verified executable path for the actual machine, not the Linux example path in the script comments.

In the application, use Build/Create → City, set the exact options across Shape, Streets and Contents, and generate a **new** map. Keep the old atlas available for comparison. Inspect full-map scale and approximately 700% zoom with district overlays off, then use overlays for diagnosis. Select a district through Style → Districts and the inspector, change its quarter program, regenerate, undo, redo, save and reload. Export SVG and PNG.

Visually confirm:

- Boat/dock details, stalls, gardens and yards sit on suitable ground and stay clear of roofs and streets.
- Pointed lots no longer contain pathological hairline tails or crushed roof detail; the town still has natural irregularity.
- River margins retain usable land without buildings on banks/water, and both banks populate where the actual land permits it.
- Open programs read as deliberate squares, gardens, burial grounds or fields with overlays off.
- Inland quarters do not show water-dependent boat/dock activity; valid waterfront areas still do.
- The map remains recognizably dense where appropriate. Removing all props/buildings or hiding textures is not acceptance.

The original red annotation on the right is not itself an identified generated feature. If a suspicious thin line persists, compare `R.render(scene, {editor:false})` with the editor display and inspect the actual feature's `data-id`, `type`, `asset` or `roofAsset`. A line present only in the editor may be a selection/node overlay. Do not invent a new generator bug from the red drawing; document the specific geometry if one is found.

## 9. Completion report

Finish with a short report and saved evidence that includes:

1. Files changed and the behavior fixed for **each I1–I6**, including the corrected interpretation of sliver and empty-space measurements.
2. The waterfront/open-space/shape-quality policies and actual constants chosen, with any remaining limitations.
3. Before/after counts and geometric violation counts, usable/open/built area summaries, diagnostic examples, and performance measurements.
4. Actual test commands and results, clearly separating Node tests, real browser workflows, inline fallbacks and visual inspections.
5. Matching before/after full-map and close-up images plus the generated JSON/options needed to reproduce them.
6. Confirmation that new generation and explicit district regeneration use the fix, while existing saved geometry is preserved on load. Tell the user to generate a new city or regenerate a district to apply it to an old map.

Do not mark an issue fixed solely because its old count changed, an unrelated test passed, or its rendering was hidden. Completion requires the intended visible behavior, full-geometry placement checks, and preservation of the editor/save contracts.
