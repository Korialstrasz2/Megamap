## City upgrade · Part 1

- Presentation-only EN/IT default labels across maps, inspectors, atlas/search and exports, with persisted custom-name protection and translated planning warnings.
- Direct header 2.5D button, Shift+V, visible zoom controls, session camera bearing, focus return and a wizard preview entry point.
- Smart buildings and landmark-complex generation are deliberately reserved for Part 2; existing generation and assets remain unchanged.

## Wizard-painted city planning and housing variety

- Wizard-only labeled brushes for water, infrastructure and 16 district/open-space roles, with layer erasers, stroke undo/redo, preview, save/load and bounded deterministic fill.
- Mixed, modest and wealthy housing with climate-dependent shapes, roof pitch, materials, spacing and facade detail in 2D/HQ/2.5D.
- Painted geometry is authoritative for placement; narrow/isolated districts and impossible water crossings report warnings. Legacy tools remain separate.
- Includes the previously delivered neighborhood, asset and 2.5D refinement sources in the repository update.

## City Studio refinement and axonometric view

- Added location-aware, preset-specific neighborhood profiles with frontage/height/material variation, mixed district seams, coherent working waterfronts and reserved signature courts.
- Added 16 original, editable City details (294 assets, 15 categories) and richer deterministic HQ roof and courtyard rendering.
- Added an offline, read-only 2.5D viewer with projected terrain, building walls and roofs, decks, foliage and vessels; four camera bearings, pan/zoom, keyboard access and full-view SVG/PNG export.
- Kept the legacy city generator and old saved geometry; viewer actions do not alter the top-down scene. Tightened routing around protected civic footprints and preserved signature sites during neighborhood regeneration.
- Added source/browser acceptance tests, English/Italian instructions and reproducible updated City Studio examples. No NPC or narrative generation.

## City Studio · independent fantasy settlement engine

- Added the separate City Studio tool, ten terrain-led fantasy presets, compact sidebar/wizard controls, physical street-frontage parcels, real courts and L-shaped buildings, civic landmarks, fleets, terrain relief and optional historic remains.
- Added standard/HQ city rendering in all existing palettes and optional roof/underground route views, without people or narrative generation.
- Retained the legacy city engine unchanged; added saved-map validation, locked neighborhood regeneration, six reproducible examples, English/Italian guides and source/browser acceptance tests.

# Megamap changelog

## Arena and HQ battle maps

- Added Arena: open fighting floor, configurable tiers/cover, opposing open entrances and editable VTT barrier walls.
- HQ defaults on for new battle maps: procedural material tiles, natural top-down foliage and rock detail, contact shadows, worn routes and furnishing/light accents. Geometry and VTT rules are unchanged.
- Added per-map HQ controls in the wizard/sidebar and Style, English/Italian labels, legacy appearance preservation, deterministic examples and automated source/browser/export checks.

## Unreleased

### Button-led wizard and six encounter expansion

- Added the English/Italian New wizard entry beside the title, complete generator sections, numeric buttons, exact editing, randomization, Back/Skip and immediate generation with sidebar handoff.
- Added forest-road, mountain-path, marsh-causeway and coastal-cove generators with no room program. Dry routes and encounter clearings are reserved before water and collision-aware cover placement; actual terrain polygons are clipped to rectangular and hex envelopes.
- Added mansion and castle interiors with separate 13-room programs, role-sized halls, independent service entrances, 13 new room roles and thematic furnishing footprints.
- Added 32 original palette-aware vector props: 278 assets in 14 categories. Runtime assets, standalone SVGs and the searchable catalogue share the same definitions.
- Added outdoor Landscape controls and live preview to the sidebar and wizard, English/Italian text, a reproducible six-map example atlas, geometric regression tests and a dedicated browser/export suite.
- Preserved previous themes and stored atlas geometry. Outdoor scenery does not automatically add VTT visibility walls or elevation/movement rules.

### Earlier workbench changes (historical notes)

- New battle encounters default to **Hex · flat top** movement cells (was square). The outer play-area shape still defaults to a rectangle.
- Replaced the random "target rooms" battle generator with an ordered **zone program** per preset. Rooms are planned in explicit steps: entrance on a map edge, later zones grown outward and biased deeper, a connected corridor spine with loops, doors cut where corridors meet rooms, and per-role furnishings. Caves label chambers by walking depth; outdoor themes mark zones along the trail.
- Added a zone editor under **Build → Battle → Encounter**: add, remove, re-role or reset the plan, with per-preset defaults from the encounter type. An empty program generates a single entrance room.
- Added `tests/battle-zones.test.cjs` (12 checks) and two browser workflows for the zone editor and the flat-top default. Counts are now 220 Node and 55 browser checks.
- Added `docs/NEXT_AGENT_ASSETS.md` listing the symbols the zone roles still approximate and the counted files to update when assets are added.
- Removed the separate V1 workbench. `index.html` now serves the single workbench interface with command search, saved presets, grouped generator settings, the selection action bar and the pinned library. `v2.html`, `src/v2/` and `START_MEGAMAP_V2.bat` were removed; `src/app.js` is the merged UI.
- On first boot the workbench reads the previous V1 autosave (`megamap-atlas-v1` / IndexedDB `megamap-offline-v1`) and preferences (`megamap-ui-v1`) when no newer local data exists. The old records are read-only and remain in the browser.
- Browser test harnesses read their inline HTML/CSS/JS as UTF-8, so the Playwright suites run on Windows instead of failing on the system code page.
- A full atlas is now a visible state instead of a silent refusal. The Build panel reports the count, the Atlas tab badge shows maps used out of 30, the Generate button states the atlas is full, and clicking it opens the Atlas panel where a map can be removed or a new atlas started.

## 1.2.0 — City envelopes, hex encounters and local terrain

- Replaced the circular city envelope with 12 shape choices, 1–100 seed/shape guidance, rotation and a live preview.
- Added concave envelope triangulation, clipping and boundary reconstruction, plus boundary-following walls and gate approach roads.
- Added 15 explicitly selectable quarter programs and a whitelist of 31 building kinds, per-quarter lot sizing, oriented/clipped rooftops and decorative props.
- Preserved other quarters and locked buildings in local regeneration. Added program changes to the Object inspector and synchronized roof transforms.
- Added 37 rooftop, 41 quarter-detail and 25 landscape symbols: 103 new assets, 246 total, all shipped as standalone SVG and editable definitions.
- Added square, pointy-top and flat-top grids with matching center snapping. Added independent outer hex boundaries, connected clipped floor retention and a central fallback for empty clipped caves.
- Preserved the campaign-region generator and added separate Local region mode: 0.5–40 km, 160-square metre-based terrain, exact sample mean and peak-to-trough relief, ten biomes, optional roads/farms/caves, no villages.
- Added elevation/land-cover styles, hillshade, metre contour intervals, scale/sample legend, cursor height and elevation CSV.
- Added configurable local/campaign grid spacing and grid JSON metadata. UVTT exports include a Megamap grid extension; importer auto-configuration remains unverified.
- Retained old atlas geometry and v1 example files. Added an eight-map v1.2 showcase and reproducible asset/example builders.
- Added 76 Node tests and 23 browser workflows to the retained 100 Node / 30 browser checks: **176 Node and 53 browser checks passed**. Browser checks use the documented inline harness, not native Windows or an external VTT.

# Changelog

## 1.0.0 — 2026-09-15

This release builds on v0.1; the v0.1 scene/atlas schema remains supported.

### Workbench and editing
- Replaced the old interface with separated Build, Atlas, Style and Export panels; searchable Library, Object and Notes panels; persistent Generate action; contextual tools; light/dark UI; collapsible sidebars and focus mode.
- Added per-map saved appearance, selected-object groups, rotation/scale/mirror, locking/hiding/GM-only flags, node dragging, path smoothing, area drawing, feature search and scale-aware measurement.
- Added per-map bounded undo/redo, imported raster library, favorites and controlled scatter strokes.
- Added single-district building regeneration and linked city navigation from regional settlements.

### Engines and rendering
- Added organic/planned/radial city seed layouts.
- Corrected generated feature-ID reuse and orphaned city building-to-district links; migration repairs old ward references by containment.
- Added interpolated regional contour fills and optional contour lines; smoothed generated river polylines; improved city wall/river openings and outer building clearance.
- Added tavern, temple, sewer, bridge, desert and ice-cave battle themes, bringing the total to ten.
- Added six map palettes in total, roof ridges and tactical floor patterns. Generated SVG includes only the required asset definitions.

### Assets and export
- Expanded the library from 40 to **143 distinct symbols** across nine categories, with standalone SVG files and an offline browsable catalog.
- Added WebP export, explicit door/light tools, collinear wall merging and portal gap subtraction in Universal VTT output, plus an HTML GM gazetteer.
- Preserved editable atlas geometry, per-map styles, notes and imported images through save/load/merge.
- Hardened structural import validation and size limits; documented offline storage and image-export limits.

### Release packaging
- Included scope-and-target README in Markdown, text and HTML; offline user guide, architecture notes, upgrade notes, provenance, examples and reproducible test scripts.
- Actual test counts and unverified environments are recorded in docs/TEST_RESULTS.txt. This is not a signed native Windows application or a full current Watabou fork.

## 0.1 — earlier supplied release

Initial three-scale generator, basic local editor, 40 symbols, atlas save/load and SVG/PNG/VTT output. The v1 package supersedes its UI and documentation.
