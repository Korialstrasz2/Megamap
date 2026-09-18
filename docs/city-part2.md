# Smart buildings and city complexes / Edifici intelligenti e complessi urbani

## English

**New wizard → City Studio → Customize → Paint a city plan** now starts with a
single **Smart buildings** brush. Paint where construction should go; choose the
preset, size, architectural character and climate as before. The generator
allocates that land to suitable quarters. Water, roads and walls remain explicit.
**Detailed districts** expands the original colors for precise assignments.
Smart and explicit areas work together; the final explicit district mask is not
reassigned. The old **Example plan** remains; **Smart example** provides a new
four-stroke starting point. The planner remains wizard-only.

The allocator reserves the preset's required roles before residential infill.
Waterfront access, street proximity, prominence, land depth, available area and
separation influence the placement. Growth stays within connected dry brush
cells, including erased holes and islands. It does not extend the painted
building mass to fabricate space. Explicit gardens and automatically assigned
parks stay open. A capital includes modest and affluent residential quarters,
trade, workshops, a port, civic/military uses and gardens; small settlements use
smaller programs rather than miniature capitals.

Preview reports **Smart quarters: fulfilled / required**. Fulfillment requires
physical buildings or, for parks, open-space geometry, not merely a label.
Missing waterfront, narrow fragments, unreachable land and unbuilt quarters
produce warnings. The generator tries alternative dry street connections before
reporting isolated groups. It never guarantees a port on an entirely dry map or
a fortress inside a brush stroke narrower than its walls. Add suitable painted
land or a road and preview again. The original stroke program is saved separately
from its generated quarter masks.

## Shared special features

New automatic and painted City Studio maps use the same reserved complexes:

- **Inner fortress:** a keep, barracks, corner towers, enclosing walls and a real
  gate opening, with separate connected approaches to the buildings.
- **Great temple gardens:** a large temple footprint, processional access,
  formal garden beds and pergolas beside—not on top of—the roof.
- **Warehouse district yards:** large paired warehouses, loading space and cargo
  detail, favoring working waterfronts and trade quarters.
- **City park and monument square:** landscaped open ground, a pavilion, tree
  groups, arcades and a central statue or fountain with circulation around it.

Suitability depends on size and quarter type. Large compounds try three fitting
scales before reporting a constraint. They are reserved before house placement;
ordinary buildings and later lanes cannot fill their courts. Explicit painted
roles are respected, and no complex is inserted outside the appropriate painted
zone. Waterfront quarters can receive connected pier geometry where a safe
shore approach fits. Four-hut settlements remain free of monumental complexes.

Ten original city-detail SVGs bring the bundled library to **304 assets**. Code,
standalone SVGs and the searchable catalog all ship in the repository. No extra
asset ZIP, API key, texture service or network renderer is required.

Everything works in standard cartography, HQ and the existing read-only 2.5D
view. Part 1's direct 2.5D button, Shift+V, preview access, Italian/English labels
and custom-name protection are retained. Language changes never regenerate a map.

## Saving, editing and limits

Previously saved mask codes 1–16 are unchanged; Smart buildings is appended as
code 17. Existing maps load their stored geometry without rebuilding. New complex
geometry survives district building regeneration, including its gates and
approaches. It is editable in the ordinary top-down editor; compound parts are
not a live CAD constraint group. Moving one part does not automatically move
its neighbors. Save your atlas and keep a backup before upgrading.

The existing 256 × 256 mask, 240-stroke, 16,000-point and 48-quarter bounds still
apply. Slope and roof heights are schematic. Smart reports describe generation,
not later manual edits. No people, factions, stories or population simulation
are generated. Open `examples/Smart-Cities.megamap.json` for two editable examples.

Developer checks: `node --test tests/*.test.cjs`,
`node scripts/build-smart-city-examples.cjs --check`, and
`python tests/browser_city_part2.py`. Browser `--inline` is only a sandbox fallback;
CI verifies the actual local entry point with the shipped security policy.

---

## Italiano

Apri **Nuova procedura guidata → Studio città → Personalizza → Dipingi una pianta
urbana**. Il pennello **Edifici intelligenti** è selezionato inizialmente: dipingi
dove vuoi costruire e lascia che modello, dimensione, architettura, clima, acqua
e strade determinino i quartieri. **Quartieri dettagliati** apre i colori
specifici: le zone esplicite non vengono riassegnate. **Esempio intelligente**
fornisce una bozza di quattro tratti; il vecchio esempio rimane disponibile.

I ruoli richiesti vengono assegnati prima delle abitazioni di riempimento.
L’anteprima mostra **Quartieri intelligenti: realizzati / richiesti**: contano
edifici reali e aree verdi, non soltanto etichette. Un porto senza acqua, zone
strette o irraggiungibili e quartieri senza edifici producono avvisi. Amplia il
terreno dipinto o aggiungi collegamenti; il generatore non inventa spazio fuori
dalla bozza. I giardini restano liberi e le isole o i buchi cancellati sono
rispettati. Il pennello rimane esclusivo della procedura guidata.

Entrambi i generatori di Studio città possono creare **fortezze interne con
porte e caserme, grandi templi con giardini, corti di grandi magazzini, parchi e
piazze monumentali**. Corti e accessi sono riservati prima delle case. I moli
vengono collegati alle strade quando la riva lo consente. Le strutture tentano
più dimensioni prima di segnalare spazio insufficiente. I piccoli insediamenti
non ricevono monumenti sproporzionati.

Dieci nuovi SVG originali portano la biblioteca inclusa a **304 asset**. Non serve
un archivio separato. Vista normale, HQ e 2.5D usano la stessa geometria. Le
etichette seguono la lingua scelta; i nomi personali restano invariati.

Le mappe esistenti non vengono rigenerate: i codici dei sedici pennelli precedenti
restano identici. I complessi sono protetti durante la rigenerazione di un
quartiere, ma la modifica manuale di una parte non sposta automaticamente tutte
le altre. Salva l’atlante prima dell’aggiornamento. Gli avvisi descrivono la
generazione iniziale, non le successive modifiche manuali. Esempi modificabili:
`examples/Smart-Cities.megamap.json`. Nessuna persona o storia viene generata.
