# Six more battle encounters / Sei nuovi scenari di battaglia

The expansion is additive: the previous 12 battle themes remain, for **18 themes** in total. The English/Italian button-led wizard and the existing sidebar both use the same settings and generation code. No runtime server, package installation, internet connection or build step is needed.

## English

### Start a map

Choose **New wizard** beside the title, then **Battle** and a **Preset**. Alternatively use **Build → Battle → Preset** in the original sidebar. A preset supplies its recommended dimensions and all relevant defaults; selecting an encounter type directly retains other current settings for custom combinations.

| Preset | Default extent (5 ft units) | Generated content |
| --- | --- | --- |
| Forest road encounter | 48 × 36 (240 × 180 ft) | A continuous winding wagon road, a roadside clearing, a broken cart and logging landmarks, trees and bramble cover. |
| Mountain path | 48 × 40 (240 × 200 ft) | A switchback trail, passing ledge, crags, loose scree, cairn and safety railing. |
| Marsh causeway | 48 × 36 (240 × 180 ft) | A timber boardwalk, dry encounter island, separate marsh pools, reeds, stumps and waterlogged timber. |
| Coastal cove | 48 × 36 (240 × 180 ft) | A beach route alongside a tidal inlet, landing area, wrecked skiff, rocks, driftwood and fishing equipment. |
| Mansion interior | 56 × 44 (280 × 220 ft) | A courtyard mansion with reception, dining, music, collections, domestic and service rooms. |
| Castle interior | 60 × 48 (300 × 240 ft) | A courtyard keep with defensive, garrison, command, household and ceremonial rooms. |

The four outdoor themes generate **no rooms, room partitions or dungeon doors**. They do not create hidden room programs when switching from an interior. The **Encounter** step shows an outdoor preview, and **Landscape** replaces irrelevant architectural controls. Paths, clearings and water remain when cover density is zero.

Both interiors are single-level floor plans with an inner courtyard and surrounding approach space, not multi-floor buildings or an entire fortified settlement. They are deliberately different room programs, not renamed versions of the same preset. Their room sizes, names, access categories and adjacency preferences remain editable in the existing planner, which can also be expanded.

### Outdoor controls

| Field | Range / choices | Meaning |
| --- | --- | --- |
| Arrival side | Seeded, north, east, south, west | Orients the route and its entry. |
| Route width | 1–4 units (5–20 ft) | Width of the route artwork. Extra clear space is reserved around it for collision-free travel. Half-unit numeric shortcuts are available. |
| Encounter clearing diameter | 2–8 units (10–40 ft) | Major diameter of the elliptical open encounter space; its smaller axis is 85% of this value. |
| Terrain variety | 0–1 | Amount of ground detail and, in marshes, pool frequency. This is not an elevation field. |
| Cover and detail density | 0–1 | Placement density of scenery props. Zero removes all props, including landmark props, but keeps the route, clearing and water. |
| Width / height | 16–80 units each | Overall map extent; square, pointy-top hex and flat-top hex grids remain supported, independently of the outer rectangle/hex boundary. |

The wizard provides button choices, per-field randomization, section randomization and editable exact values. Back, Skip and section revisiting retain settings. The last button generates immediately and returns the chosen parameters to the sidebar. Creation adds a map rather than replacing the active one. Use the normal map tools to edit geometry in place; generator parameter changes are applied when generating a new map.

Dry routes and encounter space are reserved **before** cover or water placement. Cover footprints avoid one another, the reserved corridor, water and the outer boundary. Actual terrain polygons are clipped to the envelope. A very narrow or densely configured map may have less scenery because impossible placements are rejected, not forced into the road. Rectangular maps can have a short clear approach between the route endpoint and the outer edge; on a hex envelope endpoints move inward to valid cells.

### Interior room programs

**Mansion:** grand foyer → drawing room → formal dining room → ballroom/music room → portrait gallery → library → study → kitchen → pantry → servants quarters → bathing chamber → master bedchamber → guest room.

**Castle:** gatehouse → guard post → great hall → barracks → armory → kitchen → stores → chapel → war room → prison → treasury → royal bedchamber → throne room.

Program order identifies rooms; architectural placement groups compatible spaces around circulation rather than forcing a single linear chain. The first room has the main entrance; a separate service exit is supported. Doors connect rooms to usable circulation. New public halls have more floor area than ordinary dungeon rooms, while the castle’s great hall and throne room receive additional space. The ballroom reserves a central dance floor. Bedchambers receive a single canopy bed where it fits; service and garrison quarters can contain bunks. Very small or restrictive hex envelopes may require a fallback layout or leave rooms unplaced; the planner reports this explicitly. **Fit map to program** can enlarge the extent.

### 32 new original vector props

All props are selectable, searchable, stampable, movable, rotatable and palette-aware. The catalogue now has **278 assets in 14 categories**. These are distinct vector definitions, not recoloured copies. The runtime and standalone SVGs use the same source in `src/encounter-content.js`.

**Battle landscapes (16 stable IDs):**
`battle-oak-canopy`, `bramble-patch`, `timber-pile`, `broken-cart`,
`crag-spire`, `scree-fan`, `stone-cairn`, `rope-rail`,
`marsh-tussock`, `sunken-log`, `boardwalk-planks`, `bog-stump`,
`tidal-rocks`, `driftwood-pile`, `wrecked-skiff`, `fishing-baskets`.

**Manor & castle (16 stable IDs):**
`canopy-bed`, `chaise-longue`, `harpsichord`, `banquet-table`,
`display-cabinet`, `marble-bath`, `chess-table`, `ornamental-rug`,
`royal-dais`, `armor-stand`, `war-table`, `arrow-barrel`,
`portcullis-frame`, `supply-rack`, `banner-stand`, `guard-bunk`.

Placement uses explicit footprints. Large tables, beds and instruments do not pass through room walls or block reserved circulation. The new artwork scales with its actual footprint rather than a generic square icon. Individual decorative rugs and objects are conservatively treated as occupied for generation, even where a GM would allow characters to walk over them.

### Examples, saving and exports

Open **`examples/Six-new-encounters.megamap.json`** for all six editable examples in one atlas. Save a backup of your current atlas first, or use **Export → Merge maps from another atlas** to retain your current collection. The example atlas includes bilingual names/notes; normal user names, seeds and notes are not translated by changing interface language.

SVG, PNG, WebP, grid JSON and Universal VTT exports continue to work through the existing Export panel. Five feet means nearest-neighbour spacing for hex grids; grid JSON contains orientation and center metadata. A VTT importer may still need grid alignment set manually.

**Trees, rocks, pools and cliffs do not automatically create VTT line-of-sight walls, elevation, swimming or movement-cost rules.** New outdoor presets deliberately export no dungeon walls or doors. Add wall segments in the editor where your VTT requires cover to block vision. Interior structural walls and explicit doors export as before. The portcullis-frame stamp is decorative; the gatehouse’s separate door object is the interactive portal. External VTT importers and the native Windows launcher are not exercised by these tests.

Older saved geometry remains unchanged when opened. New metadata is additive within the existing atlas schema; an older application is not guaranteed to recognize these new themes or props. Seeds are repeatable in this engine version; explicitly regenerating in a different version may change geometry.

## Italiano

### Creazione e controlli

Premi **Nuova procedura guidata** accanto al titolo, scegli **Battaglia** e una **Preimpostazione**, oppure usa i pannelli originali **Crea → Battaglia**. Le sei aggiunte sono **Scontro sulla strada nel bosco**, **Sentiero di montagna**, **Passerella nella palude**, **Cala costiera**, **Interno della dimora** e **Interno del castello**. Le dodici ambientazioni precedenti restano disponibili.

Le prime quattro sono scenari esterni **senza stanze**: mostrano un’anteprima del terreno e la sezione **Paesaggio**, non il catalogo delle stanze. Il percorso asciutto e lo spazio centrale sono riservati prima di collocare acqua e coperture. Le rocce, i tronchi e la vegetazione rispettano percorso, acqua, confine e ingombri degli altri oggetti.

La larghezza del percorso varia da **1 a 4 unità** (5–20 ft); il diametro maggiore dello spazio dello scontro da **2 a 8 unità** (10–40 ft). Lo spazio è ellittico: l’asse minore è l’85% del maggiore. Il lato di arrivo orienta il percorso. Varietà del terreno e densità delle coperture vanno da **0 a 1**. Densità zero elimina tutti gli oggetti, ma conserva percorso, radura e acqua. Le dimensioni della mappa vanno da **16 a 80 unità** per asse; ogni unità vale 5 ft. Le griglie quadrate o esagonali e il confine rettangolare o esagonale restano indipendenti.

La procedura guidata offre pulsanti numerici, valori esatti modificabili, scelta casuale per singolo campo o per l’intera sezione. **Indietro**, **Salta** e la navigazione fra sezioni conservano le scelte. L’ultimo pulsante genera subito la mappa; le impostazioni tornano nella barra laterale. La generazione **aggiunge** una mappa, senza sostituire quella attuale. Gli strumenti di modifica lavorano invece sulla geometria della mappa aperta.

### Dimora e castello

La **dimora** comprende ingresso di rappresentanza, salotto, sala da pranzo, sala da ballo/musica, galleria, biblioteca, studio, cucina, dispensa, alloggi della servitù, sala da bagno, camera padronale e camera degli ospiti.

Il **castello** comprende corpo di guardia, posto di guardia, grande sala, caserma, armeria, cucina, magazzino, cappella, sala di guerra, prigione, tesoreria, camera reale e sala del trono.

Sono due piante a un solo livello, con corte interna, ingresso principale e uscita di servizio; non generano automaticamente più piani o un’intera città fortificata. Le stanze restano personalizzabili per nome, funzione, dimensioni, accesso e vicinanza. La sala da ballo mantiene libero lo spazio centrale. Porte, corridoi e arredi usano gli stessi ingombri verificati dall’editor. Con dimensioni insufficienti lo schema può cambiare oppure alcune stanze possono non essere collocate: il programma segnala il problema, senza nasconderlo. **Adatta mappa allo schema** consente di aumentare le dimensioni.

### Libreria, esempi ed esportazione

Sono inclusi **32 nuovi simboli vettoriali**, per **278 risorse in 14 categorie**, con nomi italiani, ricerca, inserimento manuale e sei tavolozze. Le nuove raccolte sono **Paesaggi di battaglia** e **Dimora e castello**. Gli identificativi tecnici, elencati sopra, non cambiano con la lingua.

Apri **`examples/Six-new-encounters.megamap.json`** per trovare i sei esempi modificabili. Salva prima l’atlante attuale oppure usa l’unione di atlanti dal pannello Esporta. Il file di esempio contiene titoli e note bilingui.

**Alberi e rocce sono coperture visive, non muri di visibilità automatici nel VTT.** Aggiungi i segmenti di muro necessari con gli strumenti di modifica. Acqua, pendenze e scogliere non impongono automaticamente regole di movimento, nuoto, caduta o quote altimetriche. Le porte e i muri strutturali degli interni restano esportabili; la saracinesca decorativa è separata dalla porta interattiva. Un importatore VTT può richiedere la configurazione manuale della griglia.

Gli atlanti precedenti mantengono la geometria salvata. Le nuove mappe usano dati aggiuntivi: non è garantita la compatibilità con versioni precedenti dell’applicazione. **Salva atlante** resta il backup portatile; il salvataggio locale del browser non lo sostituisce.

## Development and verification

Runtime: `src/encounter-content.js`, `src/battle-landscapes.js`, existing battle engine/render/editor integration. No external runtime dependencies.

```sh
npm test
npm run assets
npm run encounters
node scripts/build-encounter-examples.cjs --check
python tests/browser_encounters.py --output /tmp/encounter-qa
python tests/browser_wizard.py --output /tmp/wizard-qa
```

Developer browser tests require Python, Playwright and Chromium. Default browser suites open the actual local `index.html` with its CSP intact. `--inline` is a development fallback which removes CSP and cannot establish local-file loading or CSP enforcement. The new suite covers both creation flows, retained settings, Italian controls, narrow layout, asset search, image/VTT exports and atlas reopening. Geometry tests cover bounded and extreme dimensions, entry rotation, every grid and envelope, route clearance, furniture containment, deterministic generation, import validation and catalogue consistency. CI retains reports, screenshots, exports and a matching source archive.

Code and original artwork: **GPL-3.0-only**, matching the repository license.
