
## Wizard-painted cities and housing climates

**New wizard → City Studio → Paint a city plan** adds labeled water, road, wall and district brushes. Sketch the layout, preview it, then generate editable streets and architecture. Painting is wizard-only; normal sidebar generation remains independent. Houses now vary by climate and means in footprint, spacing, roof form, materials and detail, including the retained 2.5D view. Open `examples/Painted-Cities.megamap.json` for two examples. See `docs/city-paint.html` for English/Italian instructions and planning limits.
# Megamap 1.2
## An offline mapmaking workbench for campaign, landscape, city and encounter maps

**Target:** tabletop game masters and campaign builders who need editable maps, predictable physical scales, configurable city layouts and a local asset library without an account, subscription, API key or online service.

**Scope:** a portable **2D procedural generator and editor**, launched from a Windows `.bat` into a browser. This is the complete source-and-runtime package for the features below. It builds on the supplied Megamap v1; it is not a signed native executable, a GIS survey system, or a full fork of Watabou's current private engine.

## City Studio refinement and 2.5D view

City Studio now gives each preset more specific neighborhood placement, architectural proportions, activity at major street frontages, quieter district edges and reserved signature courts. Sixteen new editable **City details** bring the library to **294 assets in 15 categories**. HQ adds differentiated tile, slate, shingle, thatch, turf, plaster and weathered roofs, plus clipped courtyard paving and gardens. No additional generator parameters are required.

Open a Studio map, choose **Style → Open 2.5D view**, then rotate, pan or zoom the read-only axonometric view. Terrain relief, walls, pitched roofs, trees, piers and vessels are projected from the map; export the full view as **SVG or PNG**. Return to the top-down editor to change geometry. The viewer is a schematic height projection, not a 3D editor, exact visibility solver or battle-map exporter. See [City refinement and 2.5D](docs/city-refinement.html).

Saved geometry and the legacy city tool remain intact. Newly generated Studio maps use the refined rules; old maps are not silently rebuilt. Physical settlements only: no generated people or stories.

## New: City Studio — fantasy settlements, separately from legacy cities

**Build → City Studio** adds a terrain-led, street-first settlement engine with ten curated fantasy presets: from **four huts and three boats** to a **Golden River capital with an armada**, a **Nordic council town on slopes**, canals, an oasis, a giant tree or a crater. Actual courtyard/L-shaped footprints, connected street-facing access, neighborhood character, civic compounds, quays, ships and optional older remains replace uniform parcel subdivision in this new tool.

Choose a preset and a size; customization and exact overrides are optional. **HQ** retains the existing cartographic palettes with richer roof, ground, water and foliage rendering, and can be switched off without changing geometry. Optional rooftop/underground views are route overlays, not interiors or battle maps. **No people, NPCs, population simulation or generated stories.**

The original tool is retained as **City · legacy**. Existing geometry is not automatically converted. Open **examples/City-Studio.megamap.json** for six editable examples. Read the [offline City Studio guide](docs/city-studio.html) or [English/Italian source guide](docs/city-studio.md) for controls, scale, editing, verification and limits.

## Wizard and six additional battle encounters

The large **New wizard / Nuova procedura guidata** button beside the title offers button-led creation without removing the original sidebar tabs. Choices, numeric shortcuts, individual and section randomization, Back and Skip are available; generation returns to the sidebar with the chosen settings.

**Build → Battle → Preset**, or the wizard, now includes **Forest road encounter, Mountain path, Marsh causeway, Coastal cove, Mansion interior and Castle interior**. The first four generate open terrain **without rooms**; the two interiors have different 13-room programs, furnished public, private and service spaces, and editable architecture. All 12 previous battle themes remain available: **18 total**.

The encounter expansion brought the library to **278 vector assets in 14 categories**, including **32 new landscape and mansion/castle props**. Open **examples/Six-new-encounters.megamap.json** for six ready-to-edit maps. English/Italian instructions, controls, asset IDs and export limitations are in **docs/encounter-expansion.md**; wizard instructions are in **docs/map-wizard.md**.

Outdoor trees and rocks are visual cover, not automatic VTT line-of-sight walls. Add wall segments where required. Imported older atlases retain their stored geometry; they are not regenerated automatically. The sections below describe the original v1.2 release and its historical verification counts.

## Arena and HQ battle maps

The battle library now has **19 themes**, including an open **Arena** with editable spectator tiers, opposing entrances, barriers and optional obstacles. **HQ** is enabled by default for new battle maps: textured grass/soil/sand/stone/wood/water/snow, natural top-down foliage, depth and lighting. Toggle it per map under **Style** without changing geometry. The wizard and sidebar include English/Italian controls; old saved maps preserve their original appearance. See [Arena & HQ guide](docs/arena-hq.md) and open `examples/Arena-HQ.megamap.json` for an editable example. All rendering and exports remain offline.

## Start here

1. Extract the **entire ZIP** into a normal folder. Keep `index.html`, `src/`, `assets/` and the launchers together.
2. Double-click **START_MEGAMAP.bat**, or open **index.html** directly. The application opens locally in your browser.
3. Choose **Build → Campaign region / Local region / City / Battle**. Adjust settings and press **Generate new map**. This adds a map; it does not overwrite the current one.
4. Use **Open → examples/V1.2-showcase.megamap.json** to explore eight new example maps.
5. Use **Save atlas** before closing or upgrading. It downloads an editable `.megamap.json` project; the browser determines its download location.

No installation, administrator privileges, Python, Node, local server, account or internet service is needed to **use** Megamap. The runtime is a recent desktop browser with JavaScript, SVG and Canvas support. The main target is Windows with Edge or Chrome. `start.sh` is an optional Linux/macOS convenience launcher. Native Windows execution has not been tested in this environment.

**Browser storage is not a backup or your extracted project folder.** Autosave depends on the browser's local-file origin, permissions and storage quota. A moved folder, new browser profile or private session may not recover it. Download an atlas before clearing browser data, moving the application or updating it.

## What is new in 1.2

| Requested area | Implemented behavior |
| --- | --- |
| City silhouette | 12 shapes, a live preview, 1–100 guidance, and rotation. Concave L/T shapes are actual boundaries, not just decorative masks. |
| City contents | 15 selectable quarter types and a 31-type building whitelist. Quarter-specific building proportions, rooftops and detail props. |
| Combat shapes | Flat-top hex by default, with square and pointy-top hex available; separately selectable rectangular or hexagonal outer play areas. |
| Encounter planning | An ordered zone program per preset: entrance, functional rooms and a final objective, placed, connected, doored and furnished by role. Zones can be added, removed, re-roled or reset. |
| Local regions | A separate landscape-first mode, with no villages, optional roads/farms, synthetic elevations in metres and explicit kilometre extent. |
| Assets | 103 new symbols: 37 quarter rooftops, 41 quarter details and 25 local landscape symbols. **246 distinct vector assets in 12 categories** in total. |
| Exports | Existing image/VTT exports plus a local elevation CSV and a grid-geometry JSON sidecar. |
| Compatibility | Existing v1 campaign generator retained; v1 and v0.1 atlas geometry opens without automatic regeneration. |

## 1. Cities: shape and contents

**City envelope** and **street/block layout** are now independent controls. Select organic/random, circle, oval, square, rectangle, triangle, diamond, hexagon, octagon, L-shaped, T-shaped or river-ribbon. Choose organic, planned or radial block placement separately.

**Guidance 1** ignores the selected target and uses a seeded irregular silhouette. **Guidance 100** uses the exact target envelope. Intermediate values blend target and irregular outline. With Organic/random selected, the target itself is random. Rotation turns the envelope; it does not rotate an existing saved map. The preview updates before generation.

At full guidance, generated districts and building polygons stay within the envelope. Walls follow its perimeter, with gate openings. Approach roads deliberately extend beyond it. Rivers can cut across the city and remove waterfront lots; an exact envelope is not a promise that every point inside it is occupied. A coastal backdrop changes the usable frame. Buildings can later be moved outside manually: guidance is a **generation constraint**, not an unbreakable editing lock.

**Quarter types:** Market, Commons, Old town, Artisans, Temple precinct, Noble quarter, Gardens, Docks, Military quarter, Merchants, Scholars, Industrial quarter, Shantytown, Necropolis and Farmsteads. Each checked type appears at least once; unchecked types are excluded. Quarters can repeat across blocks. If more types are checked than the target block count, the count grows to fit them. Selecting None creates unassigned, buildable plots rather than unwanted buildings.

**Building types:** Houses, Townhouses, Tenements, Shacks, Villas, Palaces, Workshops, Smithies, Shops, Warehouses, Inns, Taverns, Temples, Shrines, Monasteries, Barracks, Keeps, Stables, Libraries, Colleges, Observatories, Hospitals, Bathhouses, Mills, Barns, Granaries, Guildhalls, Fish markets, Shipyards, Greenhouses and Mausoleums.

The building checklist is a **whitelist**, not a request to force every type into every quarter. A military quarter chooses from its compatible allowed types; an academic quarter uses its own program. No compatible allowed types means no buildings in that plot. Detail props have a separate density slider: set it to zero to suppress them. The building whitelist does not filter unrelated decorative props.

Other controls remain: map width 0.5–8 km, 12–140 target blocks, density, irregularity, river, walls and coastal backdrop. Select a building to inspect its type and roof. Enable **Style → Districts**, select a district, change **Quarter program** and choose **Regenerate this district**. Other districts and locked buildings are preserved; undo restores the previous scene. Labels/notes on replaced unlocked buildings are replaced too, so lock important locations first.

This is procedural parcel subdivision, not historical urban growth or a realistic population model. Building footprints, clearances and population estimates are schematic. A river-ribbon envelope is an elongated city form, not automatic settlement growth following a user-drawn river.

## 2. Combat: grids and outer shapes

**Grid cell shape** has three choices: Square, Hex · pointy/tip top, and Hex · flat top. New encounters default to **Hex · flat top**. **Outer play-area shape** independently chooses Rectangle/square, Hexagon · pointy top, or Hexagon · flat top. For a square outer map, use equal width and height with Rectangle/square selected.

Dimensions are expressed in **5 ft units**, from 16 to 80 along each axis. For a square grid these are column/row counts. For a hex grid, **5 ft is the distance between nearest neighboring cell centers** (equivalently, the hexagon's flat-to-flat width), not the hex radius. Grid radius is spacing divided by the square root of three. Actual center positions are included in the metadata export. A hexagonal outer boundary is inscribed in the rectangular extent; unused corners remain transparent in image exports.

Snapping and the drawn hex grid use the same center geometry. Pointy and flat orientations remain distinct in saves and image exports. New stamp placements outside a hexagonal play area are rejected.

**Encounter planning.** Each preset carries an ordered **zone program**: a list of room roles such as Entrance hall, Guard post, Mess hall, Cells, Vault or Sanctum. Generation plans in explicit steps — the entrance is placed on a map edge, later zones are grown outward and biased deeper from the entrance, a corridor spine joins them (with a few loops), doors are cut where corridors meet rooms, and each room is furnished by its role. Caves label their chambers by walking depth from the cave mouth; outdoor themes place zone markers along the trail. The program is visible and editable under **Build → Battle → Encounter**: add, remove, re-order roles or reset to the preset default. The first zone is the way in, the last is the objective. Removing every zone generates a single entrance room. This is still a schematic plan, not a population or ecology simulation: rooms are rectangles on the floor raster, and doors are generated at room/corridor junctions.

The ten encounter themes remain: dungeon, forest, cave, ruins, tavern, temple, sewer, bridge, desert and ice cave. **Room and floor construction still uses an orthogonal raster**, even under a hex movement grid. This release does not generate rooms made from hex tiles. Clipping an enclosed map retains its largest connected floor area; an empty narrow cave receives a small central chamber. Outdoor maps are clipped visually without introducing a sawtoothed floor edge.

Universal VTT exports include raster image, walls, explicit doors and lights, plus a Megamap grid metadata extension. **Do not assume a VTT importer will configure a hex grid automatically.** The standard obstruction coordinates remain in 5 ft units; the importer may ignore the extension. Export the grid JSON as a setup reference and check orientation, scale and offset in your VTT. No external VTT importer was tested for this release.

## 3. Local regions: landscape at a stated scale

The previous **Campaign region** mode is retained for inhabited, schematic campaign maps. Settlement icons are oversized cartographic symbols, and settlement count is a game-preparation control—not a guarantee of realistic spacing. The new **Local region** mode is separate and does **not generate villages**.

| Control | Meaning |
| --- | --- |
| Width and height | 0.5–40 km square; **20 × 20 km** by default. |
| Mean height | Average of all stored elevation samples, in metres; −500 to 6,000 m. This is not necessarily the midpoint between minimum and maximum. |
| Height diversity | Peak-to-trough relief in metres, from 0 to 5,000 m; zero creates flat elevation. |
| Landscape | Woodland, plains, mountains, desert, badlands, wetland, coast, alpine, volcanic or tundra. |
| Water | None, streams, river/tributaries, basin lake, or sea at 0 m. |
| Roads | None, cross-country footpath, through road, or sparse road network. No roads by default. |
| Isolated farms | 0–12 optional farmstead markers with a requested minimum separation in km. Zero by default. Not villages. |
| Cave entrances | 0–20 entrance markers, with placement biased toward slopes. These do not generate underground interiors. |
| Detail | Vegetation coverage and landscape-symbol density. |

The terrain contains **160 × 160 samples** at every extent. At 20 km, samples are **125 m apart**; at 10 km, 62.5 m; at 2 km, 12.5 m. This is a local cartographic survey, **not metre-resolution landscape geometry**. Increasing the extent does not increase the sample count.

The ruler, cursor, grid spacing and CSV use the same physical scale. Hover over the map for coordinates and interpolated elevation; the map legend reports extent, height range, mean, contour interval and sample spacing. **Style** switches land cover/elevation colors, hillshade and contours. Local/campaign grid spacing is adjustable in kilometres. Forest clusters, rocks, caves and farm icons are symbols, not measured individual-object footprints; minimum stroke widths preserve visibility for narrow roads and streams.

Elevations are synthetic and mean/relief are normalized to the chosen values. Streams follow a filled-depression drainage path and are smoothed for drawing; they are not a hydrological simulation. A lake is a stylized overlay and does not modify the stored terrain. Sea level is 0 m in coastal-water mode. The selected mean and relief can yield terrain below 0 m even in other biomes. Roads use terrain costs, but engineering-grade gradients, bridges and drainage crossings are not guaranteed. Some impossible farm-placement requests produce fewer farms with a metadata warning rather than violating the separation requirement.

**Export → Elevation CSV** writes 25,600 samples in local metres: column, row, easting, northing and elevation. Origin is the bottom-left of the map; northing increases upward. This is local data with **no geographic CRS or latitude/longitude**. Brush strokes, hand-drawn roads and water overlays do not edit or regenerate the elevation field.

## 4. Existing editor, assets and export features

The workbench retains Build / Atlas / Style / Export and Library / Object / Notes panels, search, favorites, light/dark UI, collapsible panels, focus mode, zoom and fit. Tools include multi-selection, movement, path-node editing, road styles, walls, rivers, filled areas, terrain/floor brushes, scattering, labels, measurement, doors and lights. Objects can be duplicated, rotated, scaled, mirrored where supported, locked, hidden and marked GM-only. Undo/redo is independent per map during a session and is not serialized.

The **246 bundled symbols** are distinct geometry, not recolored duplicates. New Quarter rooftops are top-down building art, clipped into generated lot polygons. Quarter details include academic, sacred, military, industrial, funerary, trade and garden props. Local landscape symbols represent land-cover patches and terrain features. Existing Nature, Buildings, Infrastructure, Camp & travel, Interiors, Dungeon, Maritime, Markers and Footprints collections remain. All symbols adapt to six palettes.

Open **assets/catalog.html** for the searchable offline catalog. **assets/svg/** contains all 246 standalone SVGs. The asset definitions and builder are included. Import your own PNG/JPEG/WebP files through Library; these are normalized and embedded in the atlas. SVG uploads and remote image URLs are unsupported. Original imported-art rights remain with the rights holder.

**Save atlas** stores up to 30 maps with geometry, settings, notes and embedded images. **SVG, PNG and WebP** export the active map. Universal VTT exports battle maps; the **GM gazetteer** exports atlas notes as readable HTML. Image exports can omit GM-only objects, but **editable atlas files and GM gazetteers still contain secrets**. Never distribute an atlas as a player-safe file.

## Scope boundaries and practical limits

Megamap is not a native signed Windows application, an online AI service, a photorealistic/3D mapmaker, a multi-user editor, a geographic survey tool, a historical simulation or a seamless zoom from region to building interior. There is no automatic multi-floor dungeon, NPC simulation, imported asset-pack parser or external VTT connection.

Generation is synchronous and bounded. Complex cities can briefly pause the UI. Limits include 30 maps per atlas, 40,000 features per scene, 45 MB per imported project, 80 imported images, and 40 undo snapshots per map subject to a roughly 16-million-character budget. Paths/polygons above 250 vertices do not show individual editable node handles. Large imported images are normalized to a 1,024-pixel long side. Image exports are limited to 8,192 pixels per side and 48 megapixels total; large square exports may therefore require 4,096 pixels.

Manual overlays do not re-run terrain or urban constraints. Moving a district does not move its contents. There is no general object-collision or label-overlap solver. Door placement must align with walls for an opening to be removed in VTT geometry. Water overlays do not impose game movement rules. Review a generated map and its exports before a session.

## Upgrading and compatibility

Keep your v1 folder and downloaded atlas. Extract v1.2 separately, choose **Open**, review the maps and save under a new name. Existing geometry is retained; loading an old circular city does not silently regenerate it. Use **Build → City** for the new shape controls, or explicitly regenerate a selected district to use its new program.

The serialized schema stays at version 1 with additive fields. **New v1.2 atlases are not promised to open in older applications.** Seeds are deterministic within this engine version, but city output differs from v1. The old campaign-region generator is retained. Legacy v0.1 district references are repaired by containment where possible. Full upgrade instructions are in **UPGRADING.md**.

## Verification

**220 Node tests passed. 55 Chromium workflow checks passed** (30 existing regression workflows plus 25 v1.2 workflows), with no unhandled JavaScript page errors. The source tests and measured reports are included under `tests/` and `docs/`. The stored report files under `docs/` predate this build; see `docs/NEXT_AGENT_ASSETS.md`.

The browser environment blocks real navigation. Browser tests therefore inject the actual HTML/CSS/JavaScript into an **inline harness with the CSP meta tag removed**. They cover generation controls, new assets, editing, shape enforcement, program changes, snapping, CSV/image/VTT downloads, and save/load. They do **not** validate native Windows `.bat` execution, actual `file://` loading, enforcement of the shipped CSP, persistent storage recovery after browser restart, or external VTT imports. Source/file references and packaged data are checked separately. These results are not a certification of untested environments.

## Source, attribution and license

All runtime and corresponding editable source are included. Code and bundled vector symbols use **GNU GPL version 3 only**, with no warranty; see **LICENSE** and **NOTICE**. The guarded recursive lot-subdivision function adapts the public **Watabou / TownGeneratorOS `Ward.createAlleys`** method. Its original excerpt and provenance are included in `vendor/watabou/` and `docs/PROVENANCE.md`.

The other generators, shape guidance, district programming, local elevation model, editor and artwork are Megamap implementations. This is **not a full fork of Watabou's current generator**, does not contain private code and is not endorsed by Watabou. No comparative claim against all Watabou forks is made.

## Folder guide

| Path | Purpose |
| --- | --- |
| `index.html`, `START_MEGAMAP.bat` | Application and Windows launcher. |
| `src/` | Engine, rendering, editing, assets and UI source. |
| `assets/catalog.html`, `assets/svg/` | Offline previews and 246 standalone symbols. |
| `examples/V1.2-showcase.megamap.json` | Eight new maps demonstrating the release. |
| `docs/guide.html` | Detailed offline user guide. |
| `docs/gallery.html` | Actual workbench screenshots. |
| `docs/TEST_RESULTS.txt` | Measured test results and verification limits. |
| `docs/ARCHITECTURE.md` | Developer overview and data semantics. |
| `tests/`, `scripts/` | Optional developer tests and reproducible asset/example builders. |

Developer tests: **TEST_MEGAMAP.bat** with Node installed, or `npm test`. Browser tests additionally require Python, Playwright and Chromium. **None of those developer tools are needed to use the application.**


## Architectural battle-map overhaul

Battle generation now plans usable rooms, shared walls, circulation and doorways before role-specific furniture. The expanded zone planner includes 52 roles, nine working-plan templates, search, reordering, duplication, per-room settings, a live blueprint and explicit fit/adjacency diagnostics. Compact dwellings, branching dungeons, courtyard strongholds, axial temples, natural caves and outdoor encounters have separate planning logic.

New top-down props and material surfaces remain offline and editable. Existing saved geometry is preserved; regenerating an old seed uses the new algorithm. See [the battle-map guide](docs/battle-architecture.md) or open [the local HTML guide](docs/battle-architecture.html) for controls, compatibility and verification details.
