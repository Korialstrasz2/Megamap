# Megamap 1.2 user guide

## 1. A first campaign atlas

Open **START_MEGAMAP.bat** after extracting the complete folder. A 20 km region appears when there is no recoverable autosave. Use **Build → Campaign region**, choose a landform preset, edit the seed and press **Generate new map**. The generator adds a map; switching a preset does not replace existing geometry.

Rename the map in the canvas header. Select **Style** to choose a palette, show contour lines, choose a grid and toggle layers. These settings belong to the active map and are stored in the atlas. Campaign/local grid spacing is configurable in kilometres. Battle squares and nearest-neighbor hex centers represent 5 feet. City grids remain visual guides. See the local-survey and hex sections below for physical-scale details.

Select **Atlas** to switch maps. Duplicate map preserves its geometry and settings under a new identity. Remove map is confirmed and cannot be undone. Start a new atlas discards the current in-memory collection after confirmation. **Download a backup before either action.**

Select a settlement on a region with the Select tool. In the Object panel choose **Open linked city**. This opens an existing city with the same seed, or creates a named city. It is a separate map, not a seamless zoom. Settlement shape, nearby rivers and roads are not automatically inherited at city scale.

To prepare an encounter, use **Build → Battle**, choose one of the ten presets and generate. A suggested starting point is Roadside tavern for furniture editing, Dungeon complex for floor editing, or Forest encampment for outdoor placement.

Each preset generates from an ordered **zone program** shown under **Encounter**. The first zone is the way in, the last is the objective; each zone is placed, connected by corridors and furnished by its role. Use the row menus to re-role a room, the × button to remove one, **Add zone** to extend the plan and **Reset plan** to return to the preset default. Removing every zone still generates a single entrance room.

## 2. Navigate the workbench

**Left side:** Build sets generation options; Atlas manages maps; Style controls per-map appearance; Export writes shareable files. **Right side:** Library selects symbols; Object edits selection; Notes contains GM campaign text.

Scroll over the canvas to zoom. Drag with Pan, hold Space and drag, or use the middle mouse button. **Fit** or `0` restores the whole map. Focus mode (`F`) collapses both sidebars; their header buttons toggle them separately. The top bar switches light/dark interface colors without changing the map palette. On narrow windows the right panel opens as an overlay.

The footer shows action results and autosave status. Error messages appear there rather than silently replacing your map. **Save atlas** remains the reliable portable backup even when autosave reports success.

## 3. Select, move and transform

Use Select (`V`) and click an object. The Object panel exposes available properties. **Shift-click** toggles objects in a selection. Drag selected unlocked objects together. Arrow keys nudge by one map unit; Shift increases the step tenfold. With Snap enabled, battle placement uses the selected movement grid: square vertices or hex cell centers. Local/campaign snapping uses the visible grid geometry when enabled. Keyboard nudging remains a map-coordinate operation, not a hex-pathfinding system.

The inspector offers label and note fields, stroke width or symbol size when applicable, rotation, opacity, duplication, deletion, mirroring and raising within the feature's existing rendering layer. Group rotation/scale acts around each object's own center; it is not a transform around a shared group pivot. Raising does not move an object into a different map layer.

**Lock** blocks positional edits, transformations, deletion and field editing. You can still change the lock, hidden and GM flags deliberately. **Hide object** removes it from map rendering. Use the Find an object search to locate hidden features by label, type or notes; click a result to inspect it.

**GM-only** hides the object in Player preview and player-safe image/VTT exports. It does not delete it from the atlas or the GM gazetteer.

Undo (`Ctrl+Z`) and redo (`Ctrl+Y`, or `Ctrl+Shift+Z`) work per map while the app remains open. Text inputs keep normal text-editing undo. Up to 40 scene snapshots are retained per map, bounded by the snapshot budget; large scenes may retain fewer. Undo history is not serialized.

## 4. Draw roads, rivers, walls and areas

Choose Road, River, Wall or Area, then click points on the canvas. **Enter** or Finish path commits; **Escape** cancels the pending shape. Roads, rivers and walls need at least two distinct points. Areas need at least three points and nonzero area. Road styles are dirt, trail, cobblestone and highway. Width is measured in local map units, not directly in feet or kilometers.

Select an existing path or polygon to show its node handles (up to 250 vertices). Drag a handle to reshape it. Smooth path adds interpolated points to an open path and preserves its endpoints. Repeated smoothing increases vertex count; do not use it as an unlimited detail operation. Long paths can still be moved, duplicated or deleted without handles.

Custom paths and filled areas are overlay geometry. They do not reroute other roads, reshape elevation, move buildings or rebuild the river network. Moving a district border similarly does not automatically move its buildings. Single-district regeneration is an explicit separate operation.

## 5. Brushes, symbols and imported art

In Library, search names/tags, select a category, or filter favorites. Select a card and click the canvas to stamp it. Size and rotation are available beneath the library. After placing it, use Select and the inspector for further adjustments. Pictorial Buildings are map landmarks; **Footprints** and **Quarter rooftops** are top-down roofs. Quarter details add academic, military, sacred, industrial, garden and funerary objects; Local landscape adds terrain and land-cover patches. **Interiors** and **Dungeon** contain top-down encounter furniture and props.

Scatter places varied copies of the selected symbol along a drag gesture. It varies rotation and size. The avoidance checkbox rejects positions in water, on roads, inside buildings, or in solid battle cells; it is a placement heuristic, not a complete shape-collision solver. Disable it to deliberately place symbols in those areas. Width controls the scatter brush diameter. One stroke is one undo step.

The Brush tool paints visual material strokes on campaign, local and city maps. Local brushes do not modify the stored metre-based elevation samples. On a battlemap, Forest, Grass and Sand **carve floor cells**, while Rock fills them as solid. Water remains a visual overlay. Floor edits change implicit wall geometry; they do not remove props already placed in newly solid cells. Remove or move those props separately. Painting an outdoor theme does not turn it into a room-based theme with automatic room walls.

Use the import button beside asset search to load PNG, JPEG or WebP images. Images are embedded into the atlas after normalization, with a maximum 1024-pixel long side. Multiple files can be selected; a rejected image reports an error while valid files can still load. Imported images are capped at 80 per atlas. Importing a replacement file does not update already placed images automatically. Original SVG uploads are not accepted; render them to PNG first using your own image software.

## 6. City silhouette, contents and district regeneration

Choose **Build → City**. The **Overall city shape** control changes the envelope; the **Street / block layout** control changes the site layout inside it. There are 12 envelopes: organic/random, circle, oval, square, rectangle, triangle, diamond, hexagon, octagon, L, T and river ribbon. Choose organic, planned or radial block placement independently.

At **guidance 1**, the target is ignored: the seed makes an irregular city. At **100**, the target is enforced. In between, the outline blends the target and irregular form. Rotation changes the envelope before generation. The small preview shows the current seed, rotation and strength. Random remains random even at 100. Regenerate to apply controls; they do not silently replace an existing map.

Concave envelopes are real geometry. Lots and districts stay inside them during generation. Walls follow the city boundary; approach roads extend outward. Rivers can leave open channels and remove waterfront lots. Editing can subsequently move objects outside the boundary, so guidance is not an editing lock or physics constraint.

Open **Quarter types** and choose any of the 15 programs. Every checked program appears, while unchecked programs do not. More checked programs than target blocks raises the actual block count. All / None / Default city are shortcuts. None makes unassigned empty plots. A quarter may occupy more than one block; the controls do not yet set an individual percentage or number of blocks for each program.

Open **Building types** to choose from 31 building kinds. The selection is a whitelist intersected with each quarter's compatible program. Checking Library does not force a library into a military plot. No compatible types means an empty plot. Set **Quarter details / props** to zero for no decorative props; otherwise props follow the quarter independently of the building whitelist. Each generated building carries its kind, ward link and an oriented/clipped rooftop asset.

For example: select Rectangle, guidance 100, Planned town, no river; enable Military, Market, Commons and Artisans; allow Barracks, Keeps, Stables, Smithies, Shops and Houses. Generate an organized garrison town without temples or academic buildings. For an irregular holy city, choose T-shaped, guidance 65, and Temple precinct, Scholars, Gardens and Noble quarter.

To regenerate one district, enable **Style → Districts** and select a plot, or search for its name/type in Object. Set **Quarter program**, then **Regenerate this district**. Other districts and locked buildings are preserved; the new program still respects the map's building whitelist. The modified district's revision seed changes the result. Undo restores the exact prior scene. Local regeneration does not reshape the whole envelope or redistribute the other quarters.

Labels and notes attached to replaced unlocked buildings are replaced too. **Lock important buildings and save first.** A locked building can remain even when it is incompatible with the newly selected program, because preserving your edit takes precedence. Moving a district alone does not group-move its contents or recompute adjacent streets.

## 7. Doors, walls and lights for VTT

Door and Light tools are available only on battle maps. Draw a custom wall with Wall, or use an implicit boundary between floor and solid cells. Choose Door, click both ends of the opening **on the same straight wall segment**, then press Enter. Square-grid snapping helps with grid-aligned walls. Under a hex movement grid, switch Snap off to align door endpoints with orthogonal floor walls.

The exporter merges collinear wall segments, subtracts matching door openings, and emits the door as a closed/openable portal. A door not collinear with a wall does not erase that wall. The editor does not automatically pick, snap onto or validate a door's parent wall: align it yourself. Imported VTT modules may interpret portals differently.

Place a Light, then edit its radius in grid cells, intensity and color. Its editor circle is a guide, not a baked lighting effect. Exported light metadata is separate from the map image. Symbolic torches/braziers do not create actual lights automatically; add a Light object where needed.

VTT export includes an embedded PNG, dimensions and pixel scale, obstruction lines, portals and lights. It suppresses the drawn grid, labels and map furniture. Hidden and player-excluded objects are omitted. Normal layer visibility changes the image, not the obstruction metadata. This is **Universal VTT**, not a native Foundry scene or live VTT integration; use a compatible importer and inspect the result before play.

## 8. Save, reopen and update

**Save atlas** downloads the complete editable project, including all maps, styles, notes and imported images. It does not overwrite a file in place. Browser download settings determine the location and may add a suffix to repeated file names.

**Open** validates an atlas before replacing the current collection. Invalid files leave your current project intact. Opening a valid file asks for confirmation when the current project has unsaved edits. **Export → Merge maps** appends validated maps and embedded library assets without replacing existing maps, subject to the atlas limits.

V1 and v0.1 files remain supported. Keep an untouched backup; open it in v1.2 and save under a new name. Legacy city ward references are repaired by containment where possible. Styles missing from the old file use defaults. Imported geometry is retained, but a new generation with the same seed uses the v1.2 engine and can produce a different map.

Local autosave may use IndexedDB or a localStorage fallback. Storage can be unavailable on restricted browsers or under local file origins; the footer reports this. Storage is not guaranteed across browsers, moved folders, private sessions, profile cleanup or browser restarts. Never rely on it as your only copy. Recovery across actual browser restarts was not verified in the release environment.

## 9. Export and privacy

Choose Export and a width preset. **SVG** preserves vector shapes and embedded images. It can be edited in external vector software but is not a substitute for an atlas file, and SVG edits cannot be imported as scene geometry. **PNG** is lossless; **WebP** is encoded at a high quality setting. At maximum dimensions exports may be rejected to avoid excessive memory use; choose 4096 or 2048 instead.

The image switches control labels, compass/scale furniture and player-safe filtering. Map notes are never drawn onto map images. **GM gazetteer** is a separate readable HTML document listing notes and named sites across the atlas, including secret content. It can be opened offline or printed from a browser.

Share exported player-safe map images, not the GM atlas. The atlas includes hidden objects, GM flags, raw notes and image data regardless of the player-safe switch.

## 10. Shortcuts

| Key | Action |
| --- | --- |
| V / H | Select / Pan |
| R / A / S | Road / Stamp / Scatter |
| B / L / M | Brush / Label / Measure |
| Space + drag | Temporary pan |
| Wheel / 0 / F | Zoom / Fit / Focus mode |
| Shift-click | Add/remove an object from selection |
| Arrows / Shift+Arrows | Nudge / Larger nudge |
| Ctrl+D | Duplicate selection |
| Delete | Delete unlocked selection |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Download atlas backup |
| Enter / Escape | Commit path / Cancel or deselect |
| ? | Open help |

## 11. Troubleshooting

**The launcher cannot find a file:** extract the entire ZIP again and keep `index.html`, `src/`, `assets/` and the launcher together. Do not run the `.bat` from inside an archive viewer. Open `index.html` directly to isolate a file-association problem.

**Blank page or blocked scripts:** your browser or organization may restrict local applications. Check the browser's developer console and the package's completeness. Do not disable your organization's security controls. The app contains no runtime network dependency; a compatible unrestricted personal browser is the intended environment.

**Autosave unavailable:** continue editing, but use Save atlas. A local file does not automatically have persistent browser storage permission.

**Map is slow:** reduce city blocks, scatter fewer symbols, hide unnecessary layers and keep fewer large maps/images in an atlas. The generator runs synchronously with explicit size limits. There is no remote worker or streaming renderer.

**Map is off-screen:** press `0` or click Fit. Selection search can center a feature outside your current view.

**Cannot edit an object:** check its Lock flag, use Select, turn off Player preview for GM-only objects, and search hidden items in Object. Paths over 250 vertices do not display editable handles.

**PNG/VTT export fails:** reduce output width, verify image dimensions, and try SVG export. External importer compatibility is outside the tested scope. Doors must align with wall segments and lights must be explicit Light objects.

**Unexpected city/terrain layout:** use another seed or edit the map manually. Generation is a starting point, not a physical or architectural guarantee. The detailed scope is in README.html.

## 12. Local landscape surveys

Use **Build → Local region**, not Campaign region. Campaign mode retains its inhabited schematic map behavior. Local mode generates landscape without villages, and without farms or roads unless requested. Map markers are symbolic: a forest cluster is land cover, not a single 50-metre tree.

Start with **Woodland survey** for a 20 × 20 km landscape, then adjust Width & height, Landscape type, Mean height and Height diversity. Mean height is the average of all samples in metres; diversity is the exact peak-to-trough relief in metres, not a generic roughness rating. The actual minimum/maximum need not be symmetrically spaced about the mean. Zero diversity gives a flat elevation field.

The ten environments are woodland, plains, mountains, desert, badlands, wetland, coast, alpine, volcanic and tundra. Nine curated presets provide starting values, including cave country. All environments are still editable with the controls. Presets set defaults; they are not a terrain-type restriction system.

Select No water, Streams, River & tributaries, Basin lake or Sea at 0 m. Select No roads, Footpath, Through road or Sparse network independently. Water channels and routes are stylized; not all crossings have engineered bridges. Sea at 0 m uses the sample elevations. A lake is a polygon overlay and does not excavate the stored terrain.

**Isolated farms** means farmstead markers, not villages. Choose a minimum farm separation in km. If too many farms cannot fit on dry ground, the generator can create fewer and records a warning in map metadata. **Cave entrances** chooses entrance markers biased toward slopes; this does not generate an underground map, connected tunnels or terrain erosion.

**Style** offers Land cover / Elevation colors, hillshade and contours. The legend lists extent, minimum/maximum, mean, contour interval and sample spacing. The cursor reports local easting/northing and interpolated metres. Use Measure to verify map distances. Square sides and nearest-neighbor hex centers use the chosen Grid spacing (km).

Resolution is always 160 × 160: 20 km → 125 m spacing; 10 km → 62.5 m; 2 km → 12.5 m. The extent control changes the represented distance, not the sample count. Height-normalization is deterministic and synthetic; no real-world location or geographic CRS is implied. It is suitable for planning travel and terrain, not measuring real slopes or placing metre-scale cover everywhere on a 20 km map.

**Export → Elevation CSV** includes 25,600 rows plus a header. Columns are column, row, easting_m, northing_m and elevation_m. Samples are at cell centers, not map corners. Column/row count from the upper left, while easting/northing use a bottom-left origin, with northing increasing upward. Painting terrain, adding roads or drawing water does not alter the DEM. Keep the atlas for editable graphics and CSV for height data.

## 13. Square and hex encounters

In **Build → Battle**, set **Grid cell shape** to Square, Hex · pointy/tip top or Hex · flat top. New encounters default to **Hex · flat top**. Then choose the **Outer play-area shape** independently. Rectangle/square with equal width/height makes a square map. Hex outer shapes are regular hexagons inscribed inside the chosen physical rectangular extent; unused corners are transparent in image exports.

Width/height inputs are measured in 5 ft units. These are column/row counts only for square cells. Hexes use 5 ft between nearest neighboring centers (also flat-to-flat width), with radius equal to this spacing divided by √3. A 40-unit-wide encounter has a 200 ft rectangular extent; it does not promise exactly 40 hex columns.

Snap aligns stamps and point placement to the hex centers used by rendering. Pointy and flat orientation are preserved in the atlas. Stamps outside the outer hex boundary are rejected. Panning, selection and existing generic vector edits remain available. Changing a map's Style grid does not rebuild its architecture or boundary; new Build options take effect when generating a new map. Hiding the grid with None preserves the battle movement-grid type for snapping and metadata export.

Dungeon architecture remains an orthogonal floor raster. Selecting hex changes the movement grid, not the shape of generated rooms. For hex-bounded enclosed maps the largest connected clipped floor area is retained; a central chamber prevents completely empty clipped caves. For outdoor maps, render clipping makes a clean edge instead of a raster staircase.

For image-only VTT use, export PNG/SVG with the grid or add a grid in your VTT. **Export → Grid metadata** downloads the type, physical distance, local center origin, radius and outer shape. Universal VTT exports include the same data in a Megamap extension, which importers may ignore. Its embedded image omits the movement grid and furniture as before. Manually choose the matching hex orientation and adjust scale/offset in the importer; verify with known center distances. External VTT import is not validated by this release's tests.

## 14. New examples and verification

Open `examples/V1.2-showcase.megamap.json` for three different city envelopes, three landscape surveys and both hex encounter orientations. The old Starter atlas and Ten encounters sampler remain unchanged to demonstrate backward import support. `assets/catalog.html` contains all 246 bundled vector symbols and can be used without the editor.

Release verification is documented in `TEST_RESULTS.txt`: 220 Node tests, 30 existing browser workflows and 25 new browser workflows passed. The stored result files describe the previous build; see `docs/NEXT_AGENT_ASSETS.md`. Browser checks used an inline harness, so local-file navigation, the shipped CSP, native Windows execution, storage restart/recovery and external VTT imports remain unverified. The app is an offline browser workbench, not a certified native desktop installation.
