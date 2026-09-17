# Megamap v1.2 architecture

Megamap ships plain JavaScript and CSS. There is no build step, transpiler or network package dependency at runtime. A browser opens index.html; UMD modules also work under Node for tests and asset generation.

## Modules

- `src/assets.js`: 246-item stable catalog, metadata, categories and 206 SVG symbol bodies with palette tokens. Original 40 symbol bodies remain in render.js. IDs, not titles, are serialized.
- `src/engine.js`: seeded randomness; geometry; convex clipping/insets and Voronoi regions; Watabou-derived guarded parcel subdivision; regional heightfield, drainage and A* routing; three city site layouts inside 12 guided envelopes, 15 quarter programs and 31 building kinds; 160-square metre-based local terrain; ten encounter themes with an ordered zone program (entrance, functional rooms, objective); import validation; implicit battle wall extraction. 
- `src/editor-core.js`: pure appearance defaults, atlas validation/migration, geometry transforms, scatter placement checks, marching-squares contour extraction, wall merging/door subtraction, hex grids/snapping, elevation CSV, grid/UVTT metadata and bounded history stacks.
- `src/render.js`: self-contained SVG, six palettes, symbol definitions, regional/local contour rendering, blurred synthetic hillshade, clipped/rotated rooftop symbols, square and both hex grids, label/GM/layer filtering, selection/node handles and standalone asset export. Terrain SVG fragments are cached per heightfield object and style/revision key.
- `src/app.js`: DOM controller, map/selection state, drag tools, property inspector, project import/export, download handling, bounded rasterization, image import, local autosave and keybindings.
- `index.html` / `src/style.css`: workbench structure, accessible control labels, keyboard focus treatment, responsive sidebars and offline help.

The browser diagnostic `window.MegamapApp` exposes the active scene/atlas, validation and generation for reproducible developer tests. It is a local JavaScript interface, not a network service.

## Data model

An atlas is `{format:'megamap-atlas',version:1,appVersion:'1.2.0',active,maps,library}`. A map uses `{format:'megamap',version:1,engineVersion,mode,seed,width,height,scale,units,features,...}`. Coordinates are local, not latitude/longitude. Campaign/local/city width is 1000 local units; battle width is likewise 1000, with cell size derived from column count.

Each feature has a unique string ID and a type. Paths use `points`; areas/buildings/districts use `polygon`; symbols/labels/lights use x/y. Buildings retain a ward ID. Feature IDs are assigned monotonically during generation so removing coastal or water-overlapping features cannot cause identifier reuse. UI edits use generated IDs. Persisted appearance is normalized separately from geometry.

Generation is deterministic for equal seeds/options within this engine version. Editing/scattering introduces additional operation state. Regeneration is not a seed-compatible contract across engine versions; the full geometry is saved to avoid depending on regeneration for file recovery.

## Boundaries

Regional topology is a fixed 112-square heightfield, rendered through interpolated contours. Marching squares pads the outside and closes loops; even-odd fills retain holes. Generated rivers are corner-smoothed drainage polylines. City shape guidance blends seeded irregular radius samples with target polygon rays; exact corner rays retain concave L/T corners at guidance 100. Ear clipping, convex intersection and boundary reconstruction clip Voronoi sites without introducing triangulation seams as streets. Layouts modify site placement, not an underlying historical road-growth simulation. District boundary editing does not propagate a full constraint graph.

Battle floors are binary cells. Implicit walls trace floor/solid boundaries for enclosed themes; forest, desert and bridge use open terrain with no implicit room walls. Custom walls are polylines. A VTT door cuts a collinear interval from an obstruction segment; it does not remove the whole wall. Images and VTT geometry are generated from a cloned active scene so switching maps during encoding does not change the output scene.

## Safety and file handling

Imported atlases are validated before replacement. No imported HTML, active SVG image payload, remote image URL or arbitrary executable asset is allowed. Text in SVG/HTML exports is escaped. Imported PNG/JPEG/WebP files are decoded and re-encoded through Canvas and embedded; keep the original artwork outside the atlas as well. Import size, feature count, map count, library count and image dimensions are bounded.

The shipped CSP denies network connections and external objects. This policy was inspected but actual enforcement was not exercised by the release's inline browser harness. Do not mistake input validation or CSP for a comprehensive security audit of arbitrary hostile documents.

## Extension points

Add a new symbol in assets.js with a distinct stable ID, category and SVG body; run `node scripts/build-assets.cjs` to rebuild standalone files/catalog. Use palette tokens for map-consistent colors. Add tests for every body.

A new generation option belongs in engine defaults and validation, then app renderOptions/presets. Keep validation, serialization, render layers and export semantics synchronized when adding a feature type. Increment the file schema when breaking serialized compatibility; do not silently reuse version 1 for an incompatible schema.

Run `node --test tests/engine.test.cjs tests/v1.test.cjs tests/v12.test.cjs tests/battle-zones.test.cjs`. Browser workflows are in tests/browser_smoke.py and tests/browser_v12.py. The inline mode is a restricted-environment fallback and explicitly does not test local-file navigation or persistent browser storage. See TEST_RESULTS.txt for the recorded release checks.

## V1.2 additive data

- `scene.mode === "local"`: a 1000-unit-wide physical square, `scale` in km; `terrain.elevationM` contains 25,600 finite samples with min/max/mean and metre cell spacing. Heights are normalized to the requested sample mean and range. Contour colors and hillshade are derived from these samples, not stored external images.
- `scene.city`: envelope boundary and anchor, selected shape/guidance, initial program counts and statistics. District features contain a quarter ID; buildings link to their district through `ward` and store `buildingKind`, `roofAsset`, `roofAngle`, `roofWidth` and `roofHeight`.
- `scene.options.quarters` and `buildings`: explicit arrays. Empty arrays have meaning and must not be replaced by defaults. The first array is a required program set; the second is a whitelist intersected with each quarter's capabilities.
- `scene.options.gridType`: square / hex-pointy / hex-flat, defaulting to `hex-flat`. `mapShape` is independent; the battle boundary is generated by `mapBoundary`. Physical map width is still `cols * 5 ft`. Hex radius is spacing/√3. Rendering and placement use the same `gridSpec`, `hexCenters`, `hexPolygon` and `snapPoint` helpers.
- `scene.options.zones`: an ordered array of zone role ids (`engine.BATTLE_ZONES`) that drives battle planning. Duplicates mean repeated rooms, an empty array is meaningful (entrance only) and an absent array falls back to `engine.BATTLE_PLANS[theme]`. `scene.battle.plan` records the roles actually placed, `scene.battle.rooms` holds their footprints (cave and outdoor markers use one-cell entries), and `scene.metadata.program` is the human-readable plan string. Adding a new role means adding its props in `ZONE_ROLES`; see `docs/NEXT_AGENT_ASSETS.md`.
- `scene.appearance.gridSpacingKm`: configurable campaign/local spacing; `terrainDisplay` and `hillshade` are local display settings. Legacy `grid: "hex"` still opens.
- Local regeneration preserves locked children, replaces unlocked children with globally unique feature IDs and obeys the selected building whitelist. Applying a program explicitly can supersede the map's original quarter checklist for that edited district. Initial generator statistics are not a live accounting system for subsequent manual edits.

CSV rows are cell-center samples. Geometry is local Cartesian, with SVG's y axis downward. CSV northing flips that axis to increase upward from the bottom-left. The export does not imply an EPSG identifier or latitude/longitude.

Enclosed battle geometry is first generated on a square raster, then clipped to the outer hex and reduced to its largest connected component. Rooms may be removed by clipping. Empty results receive a small central chamber. Outdoor themes retain the full floor raster and use an SVG clip for a clean outer boundary. Implicit LOS segments are clipped to the same outer boundary before UVTT export. The standard UVTT coordinate system remains in five-foot units; `megamap` is a documented custom extension, not a promise that another application understands it.

The browser UI keeps the v1 storage keys for compatibility. Atlas import preserves old geometry and supports additive fields, but loading v1.2 data into old executables is not guaranteed. Optional example rebuilding is `node scripts/build-v12-examples.cjs`; the previous v1 recipes are retained separately and no longer overwrite preserved v1 examples.
