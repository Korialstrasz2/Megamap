# City Studio / Studio città

City Studio is the new, independent fantasy-settlement tool. **Build → City Studio** opens it. **Build → City · legacy** retains the previous guided city generator, its shape controls, building whitelist and district programs. Loading an existing atlas does not regenerate any map.

## Start with a place, not a wall of parameters

Choose a **Preset**, leave **Settlement size** at **By preset**, and generate. This adds a map rather than replacing the active map. The same controls are available in **New wizard**. There are two sections: **Settlement** and **Customize**. Exact count overrides and optional route layers are folded away.

| Preset | Physical character |
| --- | --- |
| Four huts & three boats | Four detached huts and three skiffs at a small coastal landing, at the recommended size. |
| Imperial capital · Golden River | A large river settlement, an armada, bridge approaches, a palace compound, dense frontages and villa courts. |
| Nordic council · hillside harbor | Longhouses, a council hall, sloping neighborhoods, retaining structures and longships. |
| Bridge & market town | A river crossing, connected market streets and a fountain square. |
| Mountain citadel | A high civic precinct, terrain-routed streets and lower neighborhoods. |
| Lagoon trading port | Canals, bridges, quays, trading vessels and merchant architecture. |
| Great-tree sanctuary | A monumental protected tree that physically diverts streets and excludes buildings. |
| Oasis court city | Flat roofs, actual courtyard footprints, palms and a spring basin. |
| Crater-side arcane city | A large unbuildable crater, diverted streets, terraces and older remains. |
| Reclaimed colossus city | A fallen monumental relic, ruined foundations and new buildings. |

Open **examples/City-Studio.megamap.json** for six editable examples. They contain no generated inhabitants, NPCs, rumors, hooks, factions, population estimates or narrative notes. Existing generic editor notes remain available for text you write yourself.

## What is different from the legacy city

The new engine plans terrain and water, a primary street network and crossings, neighborhood identities, civic compounds and local squares. It then grows secondary lanes from existing roads and packs street-facing parcels along the actual curved frontage. It does not use Voronoi cells to create the streets or building lots. Neighborhood selection overlays are geometric cells, independent of the physical street fabric.

A plot has a real footprint and a connected access path. Narrow residential frontages, larger warehouses, L-shaped additions, U-shaped courtyard compounds and set-back villas use different dimensions. Courtyards are open geometry, not an image of a courtyard painted over a solid roof. Reserved courts cannot be filled by a later building pass. Frontages can be closely spaced; this is not a shared-wall structural/ownership simulator.

Building and road clearances, dry land, the chosen boundary and previously occupied land are checked during placement. Bridges and piers are explicit deck features, rather than accidental unmarked water crossings. Vessels use their whole hull bounds for water and occupancy checks. Roads form a connected graph in the automated preset test cases.

**A map is not made more realistic by filling every possible square metre.** Constrained plots remain empty. The actual building count appears below the map title. A size is a generation budget and physical extent, not a promise of a population or an exact number of buildings. The four-hut landing is a specifically tested exact preset. Explicit structure targets that cannot fit report the shortfall instead of creating overlaps.

## Controls

**Settlement size** selects an extent and approximate building budget: hamlet 0.20 km, village 0.45 km, town 0.80 km, city 1.30 km, capital 1.80 km. The extent is the whole square map, not just the inhabited footprint. **Urban fabric** chooses organic lanes, mixed planned precincts, or a more coherent planned alignment. **Visual detail** changes small landscape decoration, not the main street network.

Under **Customize**, geography, architectural character, the central fantasy landmark, historical remains, defenses, growth boundary and fleet can override the preset. Terrain-led boundaries are irregular. Strict oval, rectangular and elongated envelopes constrain generated building footprints; approach roads and surrounding scenery can extend beyond them. Water still removes usable land inside an envelope.

**Visible history** is a physical-art direction and remnant setting, not a simulation of each year. Layered and ancient settings add old wall fragments and ruined foundations; new settlements omit them. Older and newer roof treatments can coexist. The city is not a historical reconstruction or an agent-based growth model.

The **Exact overrides** section has a structure target (0 = automatic), boat count (−1 = automatic, 0 = suppress boats) and terrain relief in metres (−1 = preset, 0 = genuinely flat). Overrides take priority over recommended counts. The limits are 2,400 target structures, 40 boats and 300 m relief. A request for boats without water reports an omission rather than placing boats on land.

## Standard style and HQ

**HQ** is on for newly generated Studio maps and is available both during creation and afterward in **Style**. It adds procedural roof materials, architectural depth, paving, water marks, foliage and ship detail while retaining the existing six cartographic palettes. Standard mode uses simpler vectors. Neither mode needs an account, a texture download, an API key or an online renderer.

Switching HQ does not change a footprint, a street or a saved map's seed. The setting is stored per map, can be undone/redone and is used by SVG, PNG and WebP exports. **Roof & floor detail** remains an independent appearance control. City Studio adds procedural vector drawing code, not hundreds of near-duplicate library files; the existing 278-item asset library remains intact.

## Optional routes, not extra campaigns

Enable **Rooftop connections** and/or **Underground routes** under **Customize → Optional city layers** before generating. Then choose **Style → City view**. Surface is the default. Disabled layers are not generated or shown.

Rooftop overlays connect nearby, compatible multi-story building edges across gaps of at most 5 m. They are suggested physical connections, not game-system jump rules. Underground overlays follow selected dry main routes. They are editable route annotations, **not building interiors, complete sewer geometry, additional floors, line-of-sight walls or automatically linked encounter maps**. City scenes do not offer Universal VTT wall export; the existing battle tool remains responsible for battle geometry.

## Editing and saving

Every street, footprint, deck, landmark, court and ruin is ordinary editable vector geometry. Enable **Style → Districts**, select a neighborhood, choose a **Quarter program** in Object, then **Regenerate this district**. It rebuilds that neighborhood's unlocked building content while keeping the street network, civic landmarks, other neighborhoods, locked buildings and their access paths. Undo restores the complete previous state.

Regeneration checks current streets, water overlays and protected objects as well as the original terrain reservations. The original ground/water model is not recomputed when an overlay is moved or deleted. Freehand changes are deliberately not a live urban constraint solver: moving or deleting a building can leave its court, approach or route annotations needing a corresponding edit. Select associated objects together when editing compounds. A locked object is never silently moved to fix a conflict.

**Save atlas** stores Studio ground, geometry, settings, HQ and optional routes in the existing atlas format using additive Studio version-1 metadata. Import preserves stored geometry instead of rerunning the seed. Keep an exported backup before upgrading. Older application builds do not understand Studio-specific rendering and are not promised to display a new Studio map correctly.

## Bounds and verification

The synthetic height field is 64 × 64 samples across the selected extent. Elevations, relief and slope routing are useful cartographic constraints, not survey data, engineering gradients, a hydrological simulation or automatically terraced 3D ground. Stairs are indicated on sufficiently steep small streets; large-scale geometry remains two-dimensional.

Generation is bounded and synchronous. Larger cities can pause the interface for several seconds; fewer structures and quiet detail reduce work. Existing atlas, feature, image and export limits still apply. There is no cloud computation or background service.

Developer verification:

```sh
node --test tests/*.test.cjs
node scripts/build-city-studio-examples.cjs --check
python tests/browser_city_studio.py
```

The new source tests cover both engines, repeated presets, exact tiny settlements, independent polygon intersection checks, whole-hull water placement, connected street/access graphs, physical roof gaps, rendering, strict envelopes, option bounds, malformed imports and locked neighborhood regeneration. Browser tests cover sidebar, wizard, Italian controls, a narrow viewport, saved geometry, HQ, layers, undo/redo and image export. GitHub Actions opens the actual local entry point with the shipped CSP. The optional `--inline` test fallback removes CSP and must not be presented as a file/CSP verification.

---

## Guida rapida in italiano

Apri **Crea → Studio città**, scegli un modello e lascia **Dimensione dell’insediamento → Secondo il modello**. La nuova procedura guidata usa gli stessi controlli. **Città · classica** conserva il generatore precedente e le mappe già salvate non vengono rigenerate.

Sono disponibili dieci contesti fantasy: quattro capanne con tre barche, capitale del Fiume Dorato, consiglio nordico sui pendii, borgo del ponte, cittadella montana, porto della laguna, grande albero, oasi, cratere e colosso. **Non vengono generati abitanti, personaggi, voci, fazioni o storie.**

Le strade precedono i lotti. Corti, edifici a L, ville arretrate, magazzini, quartieri fitti e accessi vengono collocati evitando sovrapposizioni. Il numero effettivo di edifici è indicato sotto il titolo. Le dimensioni sono indicative; quattro capanne e tre barche sono un modello esatto verificato. Un obiettivo numerico impossibile lascia terreno libero e segnala il risultato.

In **Personalizza** puoi cambiare geografia, architettura, monumento, resti storici, mura, limite di crescita e flotta. I valori numerici avanzati e i livelli facoltativi sono raccolti in sezioni chiuse. **HQ** migliora materiali, tetti, profondità, acqua e vegetazione senza modificare la geometria; si può disattivare in **Stile** e viene salvato per ogni mappa.

I collegamenti fra tetti e i percorsi sotterranei sono tracciati facoltativi da abilitare prima della generazione. Si mostrano tramite **Stile → Vista città**. Non sono interni, piani aggiuntivi o mappe di battaglia. Per le mappe tattiche rimane disponibile lo strumento Battaglia.

Per rigenerare un quartiere, abilita il livello Distretti, selezionalo e usa **Rigenera questo distretto** nel pannello Oggetto. Strade, altri quartieri, luoghi civici ed edifici bloccati vengono mantenuti; Annulla ripristina la situazione precedente. Le modifiche manuali non risolvono automaticamente accessi, corti o tracciati collegati: controllali dopo lo spostamento di un edificio.

Apri **examples/City-Studio.megamap.json** per sei esempi modificabili. Salva l’atlante prima di aggiornare. Tutto il funzionamento, inclusi SVG, PNG e WebP, resta locale e offline. Il rilievo è sintetico e il risultato è una cartografia fantasy bidimensionale, non una simulazione storica o un rilievo topografico.
