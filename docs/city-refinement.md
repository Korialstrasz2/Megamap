# City refinement and 2.5D / Quartieri e vista 2.5D

This update refines **City Studio**, without replacing its simple preset-led controls or changing **City · legacy**. Everything runs locally. It generates physical settlements only, not people, factions, rumors, population estimates or stories.

## Nuanced zones without extra sliders

A neighborhood now has a physical profile: location preference, frontage spacing, building proportions, setbacks, lane spacing, building height and roof material. The preset supplies the profile automatically. The same quarter type can have a different identity in different settings.

| Settlement | Examples of physical neighborhood identity |
| --- | --- |
| Golden River capital | Naval yards, palace-side villas, bridge markets, arsenal courts and the old river quarter. |
| Nordic council harbor | Longship landing, an assembly terrace, longhouse clusters, old timber lanes and boatwright yards. Ordinary residential buildings are mostly one or two floors. |
| Mountain citadel | High garrison, upper stone courts, lower forge terraces and slope-side houses. |
| Lagoon port | Quay warehouses, canal trading courts and canalside lanes. |
| Oasis | Shaded bazaar, caravan courts, irrigated gardens and a spring sanctuary. |
| Great-tree sanctuary | Root sanctuary, sacred grove gardens and woodland halls. |
| Crater city | Astral terraces, crystal workshops and rim-side lanes. |
| Reclaimed colossus | Reclaimed foundations, relic gardens and stonecutters’ yards. |

Assignments use the generated shoreline, elevation, settlement center and nearby compatible uses. A docks program without a nearby waterfront becomes a merchant program rather than placing a shipyard inland. Major routes can attract shopfronts; quieter district edges can mix residential uses. Villa plots keep more space than the dense old town. These are compact spatial rules, not an economic or historical simulation.

Some neighborhoods reserve a **signature court** before minor roads and building infill. A court has real ground geometry, an access connection and a fitting asset. Assembly benches, working yards, colonnaded courts or excavation gardens are not scattered indiscriminately over roofs. At most seven such sites are attempted per settlement; constrained sites may be omitted. Neighborhood regeneration preserves existing signature sites, civic buildings, streets and locked objects.

The recommended fishing landing still has **four huts and three boats**. It receives only a small amount of functional detail, such as two net racks, rather than capital-scale institutions.

## Sixteen new editable assets

The new **City details** collection brings the bundled library to **294 assets in 15 categories**. All 278 earlier assets remain. These are original, distinct vector definitions, not recolored copies. They work in the library, palette-aware top-down rendering and exports; they are also used by generation where space permits.

| Stable ID | Asset |
| --- | --- |
| `city-net-racks` | Fishing net racks |
| `city-boat-slip` | Boatbuilding cradle |
| `city-capstan` | Harbor capstan |
| `city-ropewalk` | Rope-making yard |
| `city-assembly-stones` | Assembly stone benches |
| `city-runestone` | Carved standing stone |
| `city-forge-yard` | Kiln and forge yard |
| `city-cloister-herbs` | Cloister herb beds |
| `city-pergola` | Vine pergola |
| `city-cistern` | Octagonal cistern |
| `city-caravan-yard` | Caravan loading court |
| `city-covered-bazaar` | Shaded market stalls |
| `city-observatory-dais` | Astral observatory dais |
| `city-relic-garden` | Excavated relic garden |
| `city-cargo-scales` | Cargo weighbridge |
| `city-arcade-court` | Colonnaded court |

**Visual detail** still controls decorative density. Asset placement uses complete footprints and respects roads, water, buildings and existing occupied ground. Not every possible asset is forced into every city. No extra asset pack, renderer account or download is needed.

## Refined HQ

HQ differentiates **tile, slate, shingle, thatch, turf, plaster and weathered roofs**, with stable building-to-building variation and all six existing palettes. Courtyard paving and garden accents are clipped to their actual ground polygons, including after manual edits. Standard mode remains available.

HQ is appearance only: toggling it does not move buildings, change street geometry or rerun the seed. Existing Studio maps that lack the new material fields use compatible fallback rendering.

## Open the 2.5D view

Open a **City Studio** map, then choose **Style → Open 2.5D view**. The viewer projects the existing terrain and footprints into an axonometric view with extruded walls, building heights, pitched roof planes, flat roofs, trees, vessels and decks. Courtyard openings remain open. It is not merely a skewed screenshot.

Use **Rotate left/right** for four camera bearings, drag to pan, and scroll or press **+ / −** to zoom. Arrow keys pan and **Home** or **Fit view** restores the whole map. **Escape** or **Back to map** returns to the editor. Controls support English and Italian and adapt to a narrower window.

The viewer is deliberately **read-only**. Editing hit coordinates stay in the top-down map. Opening, rotating, panning, zooming or exporting the perspective does not change the city, its seed or its history. Camera position is temporary and is not saved in the atlas. Open the viewer again after changing the top-down style or geometry.

**Export 2.5D SVG** saves the full vector projection; **Export 2.5D PNG** rasterizes the full projection with a target width of 2,048 pixels, bounded to 4,096 pixels in height. Exports use the selected camera bearing, but do not use a temporary panned/zoomed crop. They inherit the active HQ, palette, layer visibility and player-view filtering. Editable atlas files still contain all stored objects, including GM-only content, and are not player-safe exports.

There is no 2.5D WebP or Universal VTT wall export. The ordinary top-down image exports are unchanged.

## What the perspective does and does not model

Terrain comes from the Studio height field and is displayed as a simplified mesh. Building heights are inferred from floor counts and structural type, using the map scale. Roofs, facades, decks, walls, foliage and ship details use procedural vector geometry. Other library stamps and imported images can remain projected flat artwork rather than fully modeled objects.

This is **schematic 2.5D cartography**, not a full 3D mesh editor, surveying tool, collision engine, line-of-sight system, or exact visibility/occlusion solver. Painter ordering can be imperfect at overlapping steep terrain or complex manually edited geometry. Underground and rooftop routes remain annotations, not automatically constructed interior floors. For precision placement or inspection, use the top-down editor.

Large cities can pause while generating or projecting; high-detail SVGs may be several megabytes. Both generation and drawing remain bounded and synchronous. No cloud processing or external network access is required.

## Saved maps, regeneration and verification

Loading a saved city preserves stored geometry. New maps use the refined rules; reproducing an old seed with the updated generator can therefore look different. Older Studio maps without refinement metadata can still be viewed in 2.5D. Only an explicit neighborhood regeneration changes that neighborhood's unlocked content, and existing signature courts remain protected. Moving a building does not automatically move every associated yard, approach or annotation.

Keep an atlas backup before upgrading and extract the whole application folder. New source modules and vector files must remain with `index.html`. Older builds may not understand the additional stamps or metadata. Legacy City and stored battle geometry are not converted.

Developer checks:

```sh
node --test tests/*.test.cjs
node scripts/build-assets.cjs
node scripts/build-city-studio-examples.cjs --check
node scripts/build-arena-example.cjs --check
node scripts/build-encounter-examples.cjs --check
python tests/browser_city_studio.py
python tests/browser_city_refinement.py
```

The source tests check spatial profiles, complete footprint separation, exact tiny settlements, deterministic materials, protected regeneration, validation, projected roofs, courtyard openings, visibility filtering, bounded capital rendering and legacy compatibility. Browser tests cover the actual local application, viewer controls, SVG/PNG export, Italian, save/reload and the unchanged top-down workflow. The optional `--inline` fallback is only for constrained local test environments: it removes CSP and is **not** evidence of shipped local-file/CSP behavior. GitHub Actions uses the actual local entry point without that fallback.

---

## Guida in italiano

L’aggiornamento raffina **Studio città** senza aggiungere una lunga serie di parametri. Ogni modello assegna quartieri in base ad acqua, altezza, posizione e attività: cantieri navali e ville nella capitale, approdo dei drakkar e terrazza dell’assemblea nel porto nordico, bazar e corti carovaniere nell’oasi, giardini dei reperti presso il colosso. I fronti principali e i margini più tranquilli possono avere usi diversi. Non si tratta di una simulazione economica o storica.

Sedici nuovi **Dettagli città** portano la libreria a **294 simboli in 15 categorie**: reti, scali per barche, argani, cortili delle corde, sedute dell’assemblea, pietre incise, forge, aiuole, pergole, cisterne, corti carovaniere, bazar, osservatori, giardini archeologici, bilance e porticati. Gli spazi caratteristici sono riservati prima degli edifici; non vengono sovrapposti casualmente ai tetti. Il piccolo approdo conserva esattamente quattro capanne e tre barche con le dimensioni consigliate.

HQ distingue tegole, ardesia, scandole, paglia, zolle erbose, intonaco e superfici invecchiate, oltre a pavimentazioni e giardini ritagliati nelle corti reali. Le sei palette e la modalità standard rimangono disponibili.

Per la prospettiva apri una mappa di Studio città e scegli **Stile → Apri vista 2.5D**. Ruota a sinistra o destra, trascina per spostare e scorri o premi **+ / −** per lo zoom. Le frecce spostano, **Home** adatta; **Esc** o **Torna alla mappa** chiudono l’anteprima. SVG e PNG esportano l’intera proiezione nella direzione scelta, non il ritaglio dello zoom. La telecamera è temporanea e non modifica né rigenera la città.

La vista è di sola lettura: modifica gli edifici nella mappa dall’alto. Altezze, terreno e ordinamento visivo sono schematici; non è un editor 3D, un sistema preciso di visibilità, un modello di interni o un’esportazione VTT. Alcuni simboli e immagini restano elementi piatti proiettati. Per un controllo preciso torna alla vista dall’alto.

Salva un backup ed estrai l’intera cartella aggiornata. Le mappe esistenti mantengono la geometria memorizzata; le nuove generazioni usano le regole raffinate. Città classica e Battaglia rimangono disponibili. Tutto funziona offline, senza personaggi, fazioni, voci o storie generate.
