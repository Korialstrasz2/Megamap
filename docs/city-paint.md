# Paint a city plan / Dipingi una pianta urbana

## English

**New wizard → City Studio → Settlement → Customize → Paint a city plan** adds a fast, optional sketch workflow. It is **only available in the wizard**. The legacy City generator, battle tools, normal Studio sidebar, and 2.5D viewer remain available.

Start blank or choose **Example plan**. Pick a labeled color and drag on the canvas. Painting enables **Use my painted plan**. **Preview city** generates a read-only preview with the current seed, size, architecture and climate; it does not add an atlas map. **Generate map** creates the editable city.

### Brushes and precedence

Light blue paints **river**; deep blue paints **sea/lake**. Gold paints **roads**; slate paints **walls**. District brushes include mixed homes, modest homes, wealthy villas, old town, market, merchants, artisans, docks, temples, military, scholars, industry, gardens, farmsteads, memorial gardens, and public squares.

Terrain, districts, roads, and walls are independent layers. The last stroke wins **within its layer**. Water always excludes buildings even when a district is painted over it. Unpainted land stays free of generated buildings; connecting roads and landscape detail may pass through it. Gardens and public squares reserve open ground, not disguised residential plots.

**Erase this layer** erases only the layer of the selected brush. With River selected, it removes water and reveals any district beneath; with a district selected, it clears district paint without removing water. With Road or Wall selected, it cuts existing paths in that layer. New strokes after an eraser are not erased. Undo/redo works by whole stroke; Clear can also be undone. Dragging works with mouse, pen or touch. Canvas keyboard controls: arrow keys move the cursor, Shift makes larger steps, Space stamps the brush, and Ctrl/Cmd+Z undoes (Shift+Ctrl/Cmd+Z redoes).

Draw roads through walls where you need gates: actual openings are left at those crossings. A drawn road across a bounded water gap becomes an explicit bridge when the span is at most **180 metres**. Roads ending in open water or longer spans are omitted over the wet part, with a warning; the tool does not invent giant sea bridges. Dry connecting streets are added where possible. Isolated districts, very narrow patches, and disconnected street groups are reported instead of forcing invalid geometry.

### Houses: means and climate

The **Housing climate** choice in Customize defaults to the selected architectural character. Overrides are Temperate, Hot and dry, Hot and humid, and Cold/snowy. This setting affects new construction, not merely palette color.

Modest houses use smaller footprints, simpler finishes, varied economical roof materials, and restrained repairs. Affluent housing uses larger plots, wider setbacks, finer roofs and richer facade details. Cold-climate homes use steeper roofs, compact forms and chimneys; hot-dry homes favor flat roofs, shade and courtyard forms; humid-climate homes favor pitched roofs, verandas and more spacing. These are varied fantasy design vocabularies, not universal rules about real cultures or historical buildings. Existing stored buildings are not automatically remodeled.

The construction distinctions appear in normal/HQ cartography and the retained read-only **2.5D view**. Geometry stays the same when switching HQ or viewing perspective.

### What the sketch controls

The sketch replaces preset water, the automatic city envelope and the automatic district layout. It does not add an unpainted palace, wall ring or fantasy monument. Size, climate, architectural character, detail and requested fleet still apply. Rivers and sea are bounded, editable generated water geometry. Streets and building footprints remain ordinary editable objects.

The district mask is sampled on **256 × 256 cells** across the square map (approximately 3.125 m per cell for a 0.8 km town). This is a fast planning tool, not a precise survey or building-scale CAD drawing. Road and wall paths retain vector strokes. Whole building footprints must fit their own painted district, clear water and obstacles, and have usable access. Narrow strips can remain empty. Building counts are placement budgets, not guarantees; each painted district receives a share of the budget.

Drafts survive Back, closing/reopening the wizard, and preset changes within the session. They are **never silently applied by sidebar generation**. Generated maps save their brush program, masks, climate and geometry inside the atlas. After reopening an atlas, **Load current map plan** in the wizard retrieves its stored sketch. Saving an atlas remains necessary to retain work between sessions. Returning to a sketch generates a **new map**, not a live rebuild of an edited map. Moving a generated water object or changing a district's program manually does not rewrite the original sketch or ground mask; edit/reload the sketch in the wizard when a new constraint layout is needed.

The limits are 240 strokes, 256 points per stroke, 16,000 total points and 48 disconnected district patches. Oversized or excessively complex plans produce an explicit error. The runtime remains offline, with no image recognition, AI service, accounts, generated people or narrative content.

Open **examples/Painted-Cities.megamap.json** for two editable examples. Source checks are in `tests/city-plan.test.cjs`; UI checks are in `tests/browser_city_paint.py`. Browser test `--inline` mode is explicitly a sandbox fallback and is not evidence of the shipped local-file security policy working.

---

## Italiano

Apri **Nuova procedura guidata → Studio città → Insediamento → Personalizza → Dipingi una pianta urbana**. Il pennello è disponibile **solo nella procedura guidata**. Parti da una tela vuota o scegli **Pianta di esempio**. Disegnare abilita **Usa la mia pianta dipinta**. **Anteprima città** mostra il risultato senza aggiungere mappe; **Genera mappa** crea una nuova città modificabile.

Azzurro: fiume. Blu scuro: mare/lago. Oro: strade. Grigio: mura. Gli altri colori indicano quartieri, incluse abitazioni modeste, case miste, ville benestanti, mercato, artigiani, banchine, templi, giardini e piazze. Acqua, quartieri, strade e mura sono livelli indipendenti: l'ultimo tratto prevale nel suo livello. L'acqua impedisce sempre gli edifici. Il terreno non dipinto rimane senza edifici generati; può contenere strade di collegamento e vegetazione.

**Cancella questo livello** agisce sul livello del pennello scelto. **Annulla tratto** e **Ripeti tratto** agiscono su tratti completi; anche lo svuotamento è annullabile. Usa mouse, penna o tocco, oppure frecce, Spazio e Ctrl/Cmd+Z sulla tela. Le strade che attraversano mura creano porte; attraversamenti d'acqua delimitati lunghi al massimo 180 m creano ponti. Attraversamenti impossibili e quartieri non raggiungibili vengono segnalati.

**Clima delle abitazioni** aggiunge varianti temperate, calde e secche, calde e umide, fredde. Cambiano forme, materiali, spaziature e dettagli: case modeste e ville non sono semplici ricolorazioni. Le differenze compaiono anche in HQ e nella vista 2.5D. Non sono aggiunte persone o storie.

La pianta sostituisce acqua, perimetro e quartieri automatici del modello. Non aggiunge palazzi o monumenti non dipinti. Le zone sono campionate su una griglia 256 × 256: è una bozza rapida, non un rilievo tecnico. Gli edifici devono entrare interamente nel quartiere; zone troppo strette possono restare vuote. Limiti: 240 tratti, 256 punti per tratto, 16.000 punti totali e 48 aree di quartiere separate.

La bozza resta durante la sessione e **non viene usata dalla generazione nella barra laterale**. Salva l'atlante per conservare pianta e geometria. Dopo aver riaperto l'atlante, **Carica la pianta della mappa** recupera lo schizzo nella procedura guidata. Le modifiche manuali alla città non ridisegnano lo schizzo originale: per cambiare i vincoli, modifica la bozza e genera una nuova mappa. Esempi: `examples/Painted-Cities.megamap.json`.
