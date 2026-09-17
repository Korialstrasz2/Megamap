# Megamap city generator - issue audit

Target: `src/engine.js` / `src/render.js`, Megamap 1.2.0 (Unreleased workbench).
Audience: an LLM or developer that has to understand, locate and fix the visual defects of a
generated city without re-deriving them from scratch.
Status of this document: findings are measured, not guessed. Every number below comes from
running the shipped modules under Node 22 and rendering the result to SVG/PNG. Reproduction
commands are in Appendix A.

---

## 0. TL;DR

The city generator (`guidedCity` -> `populateQuarter`) is structurally sound: districts tile the
envelope, buildings never overlap each other, nothing crosses the river band, walls follow the
boundary, and roofs are clipped to their polygons. The visible defects come from six specific
places, in priority order:

| # | Defect | Where | Measured (repro options, see 1.1) | User-visible as |
|---|--------|-------|-----------------------------------|-----------------|
| I1 | Quarter props are stamped on top of buildings | `engine.js:270-275` | 79 / 83 props intersect a building polygon (95%) | symbols sitting on roofs / hanging off them |
| I2 | Sliver / needle buildings | `engine.js:258,262-264` | 93 / 801 buildings have a >8u edge and a <3u edge; worst 25.6u x 0.08u (ratio 317:1) | hairline spikes in the fabric |
| I3 | Districts that straddle the river end up nearly empty | `engine.js:256-258,262-263` | largest building-free radius 51.8u, inside `f37` (7227 u2, 5 buildings) | a big hole in the city |
| I4 | "Open" quarters drop 38% of lots at random | `engine.js:255,262,269` | gardens 0.9 buildings / 1000 u2 vs artisans 3.5 | bald patches that read as missing city |
| I5 | Docks districts and shipyards far from water | `engine.js:316-322,259,263` | 7 of 10 docks wards >140u from the river; shipyards up to 413u | an inland boatyard |
| I6 | Props can overlap each other and roads; silent skips | `engine.js:273` | 1-6 prop/prop pairs, 1 prop on a road per map | clutter, no diagnostics |

The red marks on the reference screenshot map to I3/I4 (big circle), I5 or I1 (icon on a
building), I1/I2 (small cluster), and one unverified thin line (see Appendix C).

---

## 1. Reproduction

### 1.1 Options that match the screenshot

The screenshot header reads `2.4 x 2.4 km - 978 oggetti - 800 edifici`, seed `silver-vale-42`,
title `Lowgate`, shape `Organica / casuale`, guidance 44, rotation 0, walls visible, river not
visible in the viewport. The closest reproducible option set is:

```js
E.generate('city', 'silver-vale-42', {
  sizeKm: 2.4, shape: 'random', shapeGuidance: 44, rotation: 0,
  districts: 56, density: 0.1, chaos: 0.2, quarterDetail: 0.5,
  river: true, walls: true, coast: false, layout: 'organic'
});
// -> 976 features / 801 buildings / 56 districts / 83 props   (screenshot: 978 / 800)
```

Two objects are unaccounted for (possible manual edit, or a neighbouring option value). All
findings below were also measured on the *default* settings
(`districts: 55, density: 0.7, chaos: 0.45, quarterDetail: 0.7`) and on `density: 0.2 / 0.35`,
so none of them depends on the exact match. Throughout this document:

- **REPRO** = the option set above (976 / 801).
- **DENSE** = `districts 55, density .7, chaos .45, quarterDetail .7` (1956 / 1742).

The envelope itself depends only on `seed + shape + rotation` (`cityEnvelope`, `engine.js:203-245`),
so the wall, gate and tower layout is identical for every option set - only the fabric changes.

### 1.2 What the screenshot marks correspond to

- Big circle: a district with almost no buildings (I3 and/or I4). In REPRO the largest
  building-free radius inside the wall is 51.8u at (528,796), inside docks district `f37`
  (7227 u2, 5 buildings). In DENSE it is 56.1u at (532,788), same district.
- Circle around the "shield with a leaf" icon: a `shipyard` building (`f477` at 436,256,
  area 176 u2, roof asset `roof-shipyard`) 187u from the river in docks ward `f28` (170u from
  the river). The icon is the roof symbol, not a prop - but the same visual class of defect
  (I1) puts real props on roofs, and the shipyard itself is I5.
- Small cluster pointed at by the lower arrow: props over buildings and/or sliver buildings
  (I1/I2). See the zoom render described in Appendix A.3.
- Thin red squiggle on the right: not reproducible as a generated feature (Appendix C).

---

## 2. Pipeline map (where to look)

City generation, in execution order (`guidedCity`, `engine.js:286-351`):

1. `options('city', config)` - defaults at `engine.js:41-42`, whitelists at `:469`.
2. `cityEnvelope(seed, o)` - `engine.js:203-245`; returns `{polygon, anchor}`. Rotation is
   applied at `:238` and `:243-244`; scaling to an 800u box at `:240-242`.
3. River: `engine.js:290` - a 101-point polyline
   `x = (coast ? 460 : 550) + sin(y/210 + phase)*70 + sin(y/93)*12`, `width: 36`.
4. Sites: organic = rejection sampling (`:309-312`), planned = grid (`:297-301`),
   radial = rings (`:302-307`).
5. Districts: `voronoi(sites, map rect)` (`:313`), clipped to the envelope triangles and
   rejoined (`clipToEnvelope`, `:196`), fragments > 40 u2 become `district` features
   (`:314, 323-328`). **The river is not subtracted from district polygons.**
6. Quarter assignment: `engine.js:316-322`. Each selected quarter takes one free fragment by
   score; `docks` is scored by river distance (`:318`); all remaining fragments get
   `pick(r, o.quarters)` (`:325`).
7. Fabric: `populateQuarter(s, d, rng(seed + '-quarter-' + d.id))` for every district
   (`:329`, function at `:254-277`).
8. Walls / towers / gates / approach roads: `:330-340`; bridge corridors: `:341-347`.

Rendering (`render`, `render.js:121-166`):

- Layer order map at `render.js:131`: `district 0, water 2, river 3, building 5, road 6,
  wall 7, decoration 8, asset 9, poi 12, label 14`.
- `layer()` at `render.js:120`: `decoration` -> `vegetation`. **Props therefore paint after
  buildings.**
- Building fill + clipped roof symbol: `render.js:139`.
- Point/asset drawing (`icon()`): `render.js:119` - `<use x=x-size y=y-size width=2*size
  height=2*size>`; symbols are declared with `viewBox="-28 -28 56 56"` and
  `preserveAspectRatio="xMidYMid meet"` (`render.js:55`), so a prop visually occupies a square
  of `2*size` centred on `(x, y)`.
- City background is a flat `land` rect + hatch (`render.js:125`). Districts are only filled
  when the `districts` layer is on; default layers are in `editor-core.js:5`
  (`districts: false`). Sparse districts therefore show as bare land, indistinguishable from
  ground outside the wall.

---

## 3. Issues

### I1 - Quarter props are placed on top of buildings

**Symptom.** Market stalls, gardens, yards and other quarter details appear stamped over
rooftops, sometimes half outside the building they cover.

**Code.** `populateQuarter`, `engine.js:267-275`:

```js
// Fit quarter-specific open-space assets only into genuinely empty ground.
const bounds = {x: ..., y: ..., xx: ..., yy: ...};
const amount = (o.quarterDetail === 0 ? 0
  : Math.max(1, Math.round((open ? 9 : 3) * o.quarterDetail * area(poly) / 7500)));
for (let j = 0; j < amount && q.props.length; j++)
  for (let tries = 0; tries < 65; tries++) {
    const p = [lerp(bounds.x, bounds.xx, r()), lerp(bounds.y, bounds.yy, r())],
          size = 5 + r() * 4;
    if (!inside(p, poly) || nearPolyline(p, [...poly, poly[0]]) < size || waterAt(p, 29)) continue;
    if (s.features.some(f => (f.type === 'building' && inside(p, f.polygon)) ||
        (f.ward === d.id && f.size && dist(p, [f.x, f.y]) < size + f.size))) continue;
    add(s, 'decoration', {x: p[0], y: p[1], size, asset: pick(r, q.props),
        ward: d.id, quarterProp: true, rotation: 0});
    break;
  }
```

The second guard clause cannot fire for buildings: the building payload added at `:264`
(`{polygon, x, y, ward, buildingKind, roof, roofAsset, roofAngle, roofWidth, roofHeight,
label, notes}`) has **no `size` property**, so `f.size` is falsy and the distance test is
skipped. What remains is `inside(p, f.polygon)`, a test of the prop's **centre point only**,
against **any** building. A prop of visual diameter `2*size` = 10-18u centred just outside a
lot can therefore cover most of it.

**Measured.**

| option set | props | intersect a building polygon | deepest penetration |
|------------|-------|------------------------------|---------------------|
| REPRO | 83 | 79 (95%) | 23.3u |
| density .2 | 123 | 106 (86%) | - |
| DENSE | 123 | 117 (95%) | 23.4u |

"Deepest penetration" = distance from the prop's corner to the building polygon interior; the
worst cases are props almost entirely inside a building. By asset in REPRO: `market-scale 6`,
`cargo-yard 5`, `produce-stall 5`, `archery-yard 5`, `dock-crane 5`, `hedge-maze 4`,
`drill-yard 4`, `formal-garden 4`, `gazebo 4`, then 18 more assets with 1-3 each.

**Why it renders on top.** `decoration` maps to layer `vegetation` (`render.js:120`) and sorts
at `8`, buildings at `5` (`render.js:131`). No clipping or masking is applied to decorations.

**Blast radius.** Every city map with `quarterDetail > 0`. The screenshot's circled icon is in
this class even if that particular one is a roof symbol: neighbouring props overlap buildings
in the same block (verified in the zoom render of Appendix A.3).

**Fix (proposed).** Replace the centre test with a footprint test. Concretely, add a small
polygon-intersection helper to `engine.js` (vertex-inside + edge-crossing, ~10 lines - the
same helper used by the audit harness in Appendix A.2) and change the guard to:

```js
const footprint = [[p[0]-size, p[1]-size], [p[0]+size, p[1]-size],
                   [p[0]+size, p[1]+size], [p[0]-size, p[1]+size]];
if (s.features.some(f => f.quarterProp && polyOverlap(footprint, propBox(f))))
  continue;                                              // other props
if (s.features.some(f => f.type === 'building' && polyOverlap(footprint, f.polygon)))
  continue;                                              // any building
if (s.features.some(f => f.type === 'road' &&
    nearPolyline([p[0], p[1]], f.points) < f.width / 2 + size))
  continue;                                              // roads
```

Notes for the implementer:

- Keep the 65-attempt loop; props that cannot be placed are simply skipped (that behaviour is
  fine, but see I6 about diagnostics).
- A cheaper approximation (centre + 4 corners + 4 edge midpoints against `inside()`) is
  sufficient in practice and avoids a new helper, but the exact test is small and removes the
  class entirely.
- This changes the number of `r()` calls consumed per district, so regenerated maps differ.
  That is allowed: "Regeneration is not a seed-compatible contract across engine versions"
  (`docs/ARCHITECTURE.md:22`). Tests that assert building/prop counts may need updating.

**Verify.** Appendix A.2 script, `props intersecting a building` must be 0.

---

### I2 - Sliver and needle buildings

**Symptom.** Long thin triangles/wedges, some tapering to a hairline point, mixed into the
fabric. At high zoom they read as drawing errors.

**Code.** Lot generation and acceptance, `engine.js:262-264`:

```js
const minSq = lerp(310, 80, o.density) * q.factor, empty = open ? .38 : .065,
      lots = createAlleys(poly, minSq, o.chaos, .48, r, empty);
for (const lot of lots) {
  const p = inset(lot, .75);
  if (!validLot(p)) continue;          // engine.js:258: area(p) > 16 && no water/locked hit
  ...
}
```

`createAlleys` (`engine.js:23-34`) splits a convex piece along its longest edge, leaving a
`.7`-unit gap, and recurses until `area(p) < minSq * 2^(4*sizeChaos*(r()-0.5))`. Acute corners
of the parent polygon survive every cut, and `inset` (`engine.js:17`) offsets each edge by
`.75`, which can leave two vertices almost coincident. `cleanPolygon` (`engine.js:153-161`)
only removes points closer than `1e-5`, so a `0.08u` edge survives. `validLot` (`:258`) checks
`area(p) > 16` and nothing else about shape.

**Measured** (criterion: `maxEdge > 8u && minEdge < 3u`):

| option set | slivers / buildings | worst cases |
|------------|--------------------|-------------|
| REPRO | 93 / 801 (11.6%) | `f232` stable 25.6 x 0.08 (317:1), `f218` smithy 27.9 x 0.12, `f121` shipyard 26.2 x 0.12 |
| DENSE | 257 / 1742 (14.8%) | `f756` shop 14.0 x 0.00 (degenerate), `f513` warehouse 18.9 x 0.02, `f960` greenhouse 15.8 x 0.02 |

**Why it looks broken.** `fitRoof` (`engine.js:248-253`) takes the polygon's bounding box in
the longest-edge frame; for a needle that is e.g. `25.6 x 0.08`. `render.js:139` stretches the
roof symbol to that box (`preserveAspectRatio="none"` for `roof-*`, `render.js:55`) and clips it
to the polygon, so the roof art collapses to a line while the polygon stroke (`stroke-width
.7`) is several times wider than the shape. Imported atlases keep such polygons: `validateScene`
(`engine.js:513-555`) only checks point finiteness, not area or aspect.

**Fix (proposed).** Add a minimum-width test to `validLot`. The lots are convex (a convex piece
clipped by a half-plane, then inset), so the exact minimum width is the minimum over edges of
the maximum perpendicular distance from that edge to the other vertices:

```js
function minWidth(poly){                       // engine.js, near `inset`/`area`
  let w = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i+1) % poly.length];
    const len = dist(a, b); if (len < 1e-9) return 0;
    let far = 0;
    for (const v of poly) far = Math.max(far,
      Math.abs((b[0]-a[0])*(a[1]-v[1]) - (a[0]-v[0])*(b[1]-a[1])) / len);
    w = Math.min(w, far);
  }
  return w;
}
// in validLot:  ... && minWidth(p) >= 2.4 && area(p) > 16 ...
```

`2.4u` at a 2.4 km map is ~5.8 m - thin enough for a shed, thick enough to render. Alternative
if a cheaper test is preferred: reject when `area(p) < 0.12 * maxEdge(p)^2` (catches needles
without new geometry). Both change rng consumption downstream of a rejection, see I1 notes.

**Verify.** Appendix A.2, `sliver buildings` must be 0.

---

### I3 - Districts that straddle the river end up nearly empty

**Symptom.** A district-sized hole in the fabric, often next to the wall or the river, with
only a handful of buildings clustered at one end. This is the large circled area in the
screenshot.

**Code.** `engine.js:256-258` and `262-263`:

```js
const waterAt = (p, gap = 26) => s.features.some(f =>
  f.type === 'river' && nearPolyline(p, f.points) < Math.max(gap, f.width / 2 + 6) ||
  f.type === 'water' && inside(p, f.polygon));
const validLot = p => p.length > 2 && area(p) > 16 &&
  !p.some(v => waterAt(v, 24)) && !waterAt(center(p), 26) && ...;
```

For the city river (`width: 36`, `engine.js:290`) the thresholds evaluate to
`max(24, 24) = 24` for vertices and `26` for the centre - a rejection band of +/-26u around the
centreline, i.e. 8u of clearance beyond each bank. Because the district polygon is
`voronoi cell ∩ envelope` (`engine.js:313-314`) and the river is **not** subtracted,
`createAlleys` subdivides the water band along with the land. Every lot that touches the band
is rejected wholesale and the dry remainder is never re-subdivided.

**Measured.**

- REPRO: `f37` (docks, 7227 u2) has 5 buildings; largest building-free radius in the whole map
  is 51.8u at (528,796), inside `f37`. DENSE: 56.1u at (532,788), `f37`, 6 buildings.
- With the river disabled the same options give a largest building-free radius of 25.3u
  (density .7) / 30.5u (density .15) - the river roughly doubles the worst hole.
- Detailed trace of `f7` (temple, 9339 u2, DENSE): `convexParts` returns 5 parts of
  `7790, 310, 457, 577, 205` u2. `inset(part, 4.2)` (`:261`) returns `<3` points for the 310
  and 205 u2 parts - those parts are **silently skipped**. The 7790 u2 part yields 28 lots,
  plus one lot from each of the other two parts: 30 lots total, 30 accepted by the area test,
  but only 7 buildings exist - 23 lots were rejected by `validLot`. `f7`'s polygon comes within
  0.9u of the river centreline; the 36u-wide river crosses it.
- The inverse error exists too: `validLot` tests vertices and the centre only, so a lot whose
  *interior* crosses a river bend while its vertices stay >24u away is accepted. No such
  building was found in these runs (0 buildings have a vertex inside the river band), but the
  test is not water-tight for wide lots.

**Fix (proposed).** Subtract the dilated river band from the district part before subdivision,
or re-subdivide the dry remainder. Minimal version inside `populateQuarter`:

```js
// before createAlleys: cut the water band out of the part
for (const f of s.features.filter(f => f.type === 'river'))
  for (let i = 1; i < f.points.length; i++) {
    const a = f.points[i-1], b = f.points[i], len = dist(a, b);
    if (len < 1e-6) continue;
    const n = [-(b[1]-a[1])/len, (b[0]-a[0])/len];         // edge normal
    poly = clip(poly, n, n[0]*a[0] + n[1]*a[1] + f.width/2 + 8);
    poly = clip(poly, [-n[0], -n[1]], -(n[0]*a[0] + n[1]*a[1]) + f.width/2 + 8);
  }
```

That yields the *convex* intersection of the part with the corridor half-planes (parts are
convex by construction, `convexParts`), which is exactly what `createAlleys` needs. Also
replace the vertex/centre water test with an interior test (footprint corners, as in I1) so
straddling lots are rejected correctly. Optional: emit a `s.city.warnings` entry when a
district yields 0 buildings.

**Verify.** Largest building-free radius should drop to the no-river baseline (~25-30u) and
`f37` should gain buildings.

---

### I4 - "Open" quarters drop 38% of lots at random

**Symptom.** Large bald patches inside districts that should read as gardens, market squares
or cemeteries, with buildings only at the fringes.

**Code.** `engine.js:255` and `262`:

```js
const open = ['gardens', 'cemetery', 'market', 'farming'].includes(q.id);
...
const empty = open ? .38 : .065;   // probability a small lot is discarded
```

`createAlleys` drops terminal pieces when `area(p) < minSq * 2^(4*sizeChaos*(r()-0.5))` and
`r() < empty` (`engine.js:33`), and also returns `[]` with probability `empty` when
`area(p) < minSq * .55` (`:25`). For open quarters this is 38% - and the quarters that use it
also have the largest `factor` (`gardens 2.3`, `cemetery 2.2`, `temple 2.2`, `noble 2.0`,
`engine.js:96-110`), i.e. the largest minimum lot size, so few lots are produced and a large
fraction of them are dropped. The result is random holes rather than a coherent open space.

**Measured** (REPRO, buildings per 1000 u2 of district area):

| quarter | districts | area u2 | buildings | bld/1000u2 | min | max |
|---------|-----------|---------|-----------|------------|-----|-----|
| gardens | 4 | 25560 | 24 | 0.9 | 1 | 10 |
| temple | 8 | 57054 | 79 | 1.4 | 3 | 18 |
| noble | 9 | 67497 | 112 | 1.7 | 4 | 21 |
| docks | 10 | 80504 | 150 | 1.9 | 5 | 24 |
| market | 5 | 35067 | 71 | 2.0 | 10 | 25 |
| military | 7 | 57400 | 133 | 2.3 | 12 | 28 |
| merchants | 2 | 10986 | 30 | 2.7 | 13 | 17 |
| commons | 4 | 22774 | 65 | 2.9 | 6 | 23 |
| oldtown | 5 | 34503 | 101 | 2.9 | 6 | 32 |
| artisans | 2 | 10162 | 36 | 3.5 | 14 | 22 |

(DENSE: gardens 1.7 vs commons 8.1 - a 4.8x spread.) Single examples: `f27` (gardens,
5735 u2) = 9 buildings; `f55` (gardens, 2975 u2) = 2 buildings; `f37` (docks) = 5.

**Why it reads as "missing city".** Districts are not filled by default
(`DEFAULT_LAYERS.districts = false`, `editor-core.js:5`); the city background is a flat land
rect plus hatch (`render.js:125`). A dropped-lot hole and the ground outside the wall are the
same colour, so the hole reads as a rendering/generation failure rather than a park. The props
that would explain an open space are placed sparsely (`amount` at `:269` is 9 per 7500 u2 for
open quarters) and, per I1, often land on the remaining buildings.

**Fix options (pick one, they are not exclusive).**

1. Make drops coherent: instead of an independent coin per lot, drop a connected region
   (e.g. pick one seed lot, drop it plus its neighbours until ~38% of the area is open) and
   emit a single `plaza`/`area` feature for it so it renders deliberately.
2. Lower `empty` for `gardens`/`farming` (which have prop coverage) and keep it high only for
   `cemetery`/`market`, or drive it from `quarterDetail`.
3. Render districts with a faint tint by default (`DEFAULT_LAYERS.districts` or a lighter
   always-on district wash) so sparse quarters are legible as districts.

**Verify.** Re-render REPRO and confirm each district has a contiguous built area or an
explicit open-space feature; per-quarter density spread should fall well under 3x.

---

### I5 - Docks districts and shipyards far from water

**Symptom.** Shipyards, fish markets and docks quarters sitting in the middle of the city,
hundreds of metres from the river. In the screenshot this is the "shield with leaf" building
(`roof-shipyard`) circled in a block with no water in sight.

**Code.** Assignment, `engine.js:316-322`:

```js
for (const id of o.quarters) {
  let chosen = null, best = Infinity;
  for (const i of free) {
    const c = polygonInterior(fragments[i].polygon);
    let score = dist(c, anchor) + r() * 20;
    if (id === 'docks') {
      score = s.features.filter(f => f.type === 'river')
        .reduce((v, f) => Math.min(v, nearPolyline(c, f.points)), o.coast ? Math.abs(c[0]-780) : 500);
    }
    ...
  }
  if (chosen != null) { assignments.set(chosen, id); free.delete(chosen); }
}
```

Only the **first** `docks` entry is scored by river distance. Every later docks fragment comes
from the random fallback at `:325`
(`id = assignments.get(i) || (o.quarters.length ? pick(r, o.quarters) : 'unassigned')`), and
`populateQuarter` filters the building pool by kind only (`:259`), never by water proximity -
so a `shipyard` can be placed in an inland docks ward.

**Measured.**

| option set | docks wards, distance to river (u, sorted) | shipyard/fishmarket buildings | max / median distance to river |
|------------|-------------------------------------------|-------------------------------|-------------------------------|
| REPRO | 4, 57, 61, 144, 170, 176, 260, 291, 302, 392 | 76 | 413 / 187 |
| DENSE | 4, 92, 205, 427, 431 | 54 | 455 / 198 |

Examples (REPRO): `f95` shipyard 354u, `f101` shipyard 413u, `f105`-`f108` 354-372u (all ward
`f4`); `f795`/`f800`/`f815`/`f816` 255-297u (ward `f47`); `f487`/`f492` 226-255u (ward `f29`);
`f726`/`f730`/`f731`/`f734` 189-209u (ward `f43`). The circled building `f477` is 187u from
the river.

**Fix (proposed).**

1. Repeat the docks scoring for every fragment that ends up as `docks`, not just the first:
   after `:325`, if `id === 'docks'` re-pick the nearest remaining free fragment instead of
   taking a random quarter. (Cheapest change, fixes the district placement.)
2. Constrain water-dependent kinds inside `populateQuarter`: tag them
   (`shipyard`, `fishmarket`, `warehouse`, plus props `dry-dock`, `dock-crane`,
   `fishing-racks`) and, when placing them, require the lot centre to be within e.g. 120u of
   the river or coast water. Fall back to a non-water kind if the constraint fails.
3. Alternatively, split the docks program into "waterfront" (shipyard, fishmarket, dry-dock)
   and "inland storage" (warehouse) and filter the pool per lot.

**Verify.** After the fix, every `shipyard`/`fishmarket` should be within a configurable
distance of a `river`/`water` feature, and docks wards should sort near the front of the
river-distance list.

---

### I6 - Smaller placement defects and missing diagnostics

- Props can overlap each other: 1 pair in REPRO (`pond-garden` + `gazebo`), 5-6 pairs in
  other option sets (`formal-garden` + `pond-garden`, `gazebo` + `gazebo`, ...). The guard at
  `:273` only checks same-ward features with `size`, so cross-ward prop collisions are never
  tested.
- One prop overlapped a road in the measured runs; the guard never tests `road` features.
- Props that cannot be placed are skipped silently: the 65-attempt loop at `:270` simply ends.
  No counter and no `s.city.warnings` entry exists.
- `s.city.warnings` (`engine.js:292-294`) only covers the global cases ("no quarters",
  "no building types", "docks without water"). A quarter that yields zero buildings - the I3/I4
  cases - produces no warning.

---

## 4. Cross-cutting notes for a fixer

**Determinism and rng streams.** `rng()` (`engine.js:10`) is a single counter-based stream.
`guidedCity` uses `rng(seed)` for the envelope, river phase, sites and assignment; each
district gets an independent stream `rng(seed + '-quarter-' + d.id)` (`:329`), and
`regenerateDistrict` (`:278-285`) reseeds with `-` + revision, so per-district edits stay
independent. Any change in the *number* of `r()` calls inside a stream shifts everything
downstream of that call. That is acceptable for correctness (regeneration is not a
seed-compatible contract, `docs/ARCHITECTURE.md:22`), but it will change existing test
expectations - check `tests/engine.test.cjs`, `tests/v1.test.cjs`, `tests/v12.test.cjs` for
count assertions before/after.

**Feature ids.** Monotonic per scene via `add()` and a `WeakMap` counter (`engine.js:65-66`);
removing features never reuses ids. Any fix that adds/removes `add()` calls is safe in this
respect.

**Render layer order** (single source of truth, `render.js:131`):

```
district 0  plaza 1  water 2  river 3  area/paint 4  building 5  road 6  wall 7
decoration 8  asset 9  image 10  settlement 11  poi 12  room 13  label 14
```

Props (I1) draw at 8, buildings at 5 - that is why they cover roofs. Moving props below
buildings would hide them in dense quarters but is not a fix: the overlap itself is the bug.

**Validation gaps.** `validateScene` (`engine.js:513-555`) checks types, id uniqueness, text
lengths, numeric ranges and polygon point validity, but nothing about polygon *shape*: no
minimum area, no self-intersection, no aspect ratio. I2's needles therefore survive import and
export. If a cheap guard is wanted, reject `building` polygons whose `minWidth` (I2) is below
the same threshold.

**The editor's own placement check is stricter in intent, not in effect.**
`canPlace` (`editor-core.js:29-34`) tests `f.type === 'building' && E.inside(p, f.polygon)`,
i.e. also only a point; the scatter tool compensates with a radius. The generator has no such
compensation - which is the root of I1.

---

## 5. Suggested order of work

1. **I1** (props over buildings) - smallest change, biggest visual win, no geometry maths
   beyond a 10-line helper.
2. **I2** (slivers) - one `minWidth` guard in `validLot`; removes 12-15% of buildings as
   needles.
3. **I5** (inland docks) - one re-pick at `:325` plus an optional water-distance filter for
   three building kinds.
4. **I3** (river-straddling districts) - river band subtraction before `createAlleys`; needs
   care with convexity and rng shifts.
5. **I4** (open-quarter holes) - design decision: coherent open space vs. random drops.
6. **I6** (diagnostics) - warnings for zero-building districts and unplaced props.

Acceptance criteria for 1+2 on the REPRO options: `props intersecting a building` = 0,
`sliver buildings` = 0, building-building overlaps still 0, buildings inside the river band
still 0, feature counts within a few percent of 976/801 (they will change; that is expected).

---

## Appendix A - Reproduction harness

### A.1 Generate and rasterise

```js
// gen.cjs  (Node 22, no dependencies)
const E = require('C:/Users/alexo/Desktop/Quickdir/Megamap/src/engine.js');
const R = require('C:/Users/alexo/Desktop/Quickdir/Megamap/src/render.js');
const fs = require('fs');
const s = E.generate('city', 'silver-vale-42', {
  sizeKm: 2.4, shape: 'random', shapeGuidance: 44, rotation: 0,
  districts: 56, density: 0.1, chaos: 0.2, quarterDetail: 0.5,
  river: true, walls: true, coast: false, layout: 'organic'
});
console.log(s.features.length, s.features.filter(f => f.type === 'building').length);
fs.writeFileSync('city.svg', R.render(s, {}));
// zoom tile: R.render(s, {viewBox: '430 695 200 200'})  -> a 200x200u window
```

```py
# shot.py - cairosvg is not usable on this machine (no cairo-2.dll); use Playwright
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 1000})
    pg.goto('file:///C:/Users/alexo/AppData/Local/Temp/opencode/mm/city.svg')
    pg.screenshot(path='city.png'); b.close()
```

### A.2 Measurement script (the source of every number above)

```js
function segX(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const o1=o(a,b,c),o2=o(a,b,d),o3=o(c,d,a),o4=o(c,d,b);return (o1*o2<0)&&(o3*o4<0);}
function polyOverlap(p,q){for(const v of p)if(E.inside(v,q))return true;
  for(const v of q)if(E.inside(v,p))return true;
  for(let i=0;i<p.length;i++)for(let j=0;j<q.length;j++)
    if(segX(p[i],p[(i+1)%p.length],q[j],q[(j+1)%q.length]))return true;return false;}
function propBox(f){const s=f.size;
  return [[f.x-s,f.y-s],[f.x+s,f.y-s],[f.x+s,f.y+s],[f.x-s,f.y+s]];}
function dims(p){let M=0,m=Infinity;for(let i=0;i<p.length;i++){
  const d=E.dist(p[i],p[(i+1)%p.length]);M=Math.max(M,d);m=Math.min(m,d);}return [M,m];}
// props over buildings
const hits = P.filter(p => B.some(b => polyOverlap(propBox(p), b.polygon))).length;
// slivers
const slivers = B.filter(b => { const [M,m] = dims(b.polygon); return M > 8 && m < 3; }).length;
// largest building-free radius: grid-sample the envelope, min distance to any building polygon
```

### A.3 Visual spot checks used for this report

- `viewBox '430 695 200 200'` - the river-margin hole of I3 (`f37`, largest free radius 51.8u).
- `viewBox '413-45 262-30 90 60'` - the `shipyard f477` roof symbol (I5) with props on roofs
  (I1) in the same frame.
- `viewBox '174-45 396-30 90 60'` - the worst sliver `f232` (I2) plus a `cloth-stall` prop
  stamped over a building.

---

## Appendix B - Evidence tables

### B.1 Quarter density, REPRO (buildings per 1000 u2)

```
gardens  0.9   temple 1.4   noble 1.7   docks 1.9   market 2.0
military 2.3   merchants 2.7   commons 2.9   oldtown 2.9   artisans 3.5
```

### B.2 Docks and water buildings, REPRO

```
docks ward distance to river (u):      4 57 61 144 170 176 260 291 302 392
shipyard/fishmarket count:             76
distance to river (u): max 413, median 187, min 36
```

### B.3 Prop overlap by asset, REPRO (props intersecting a building)

```
market-scale 6, cargo-yard 5, produce-stall 5, archery-yard 5, dock-crane 5,
hedge-maze 4, drill-yard 4, formal-garden 4, gazebo 4, cloth-stall 3,
fishing-racks 3, reflecting-pool 3, processional-square 3, ... 14 more with 1-2
```

### B.4 Largest building-free radius by option set

```
REPRO (river on)          51.8u at (528,796)  inside f37 docks 7227u2 / 5 buildings
DENSE (river on)          56.1u at (532,788)  inside f37 docks 7227u2 / 6 buildings
DENSE (river off)         25.3u at (420,230)
density .35 (river off)   21.8u at (740,385)
density .15 (river off)   30.5u at (655,320)
```

---

## Appendix C - Open questions

1. **2-object delta.** The screenshot reports 978 objects / 800 buildings; the closest
   reproducible option set gives 976 / 801. A neighbouring value (`districts 55-58`,
   `chaos .15-.25`, `quarterDetail .4-.6`) or a manual edit explains it. No finding depends on
   the exact value.
2. **The thin red squiggle on the right of the screenshot** was not identified. It is thinner
   (about 0.7u at the implied zoom) than any generated stroke: road 2-9u, wall 5u, portal 6u,
   selection outline 2.5u. It is most likely a hand-drawn annotation or a selected path, not a
   generator artifact.
3. **Which mark is which.** The mapping in section 1.2 is inferred from geometry and zoom
   (724% readout -> ~138u viewport at the time of capture, or ~276u if the readout was 362%).
   The class-level findings (I1-I5) hold for every option set tested, independent of the exact
   viewport.
