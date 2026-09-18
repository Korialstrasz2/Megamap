# City upgrade — Part 1 / Aggiornamento città — Parte 1

## English

Part 1 delivers language-aware map labels and easier access to the existing
read-only 2.5D viewer. It does **not** change the city generation rules, painted
zones, assets, or saved geometry.

### Labels follow the interface language

Choose English or Italian in Settings. Recognized generated titles, neighborhood
names, civic landmarks, building program names and descriptive map features now
follow that language in the top-down map, Object inspector, atlas list, search,
image exports and 2.5D view. Existing stored default labels are supported too;
you do not need to regenerate a city. The local survey legend and city planning
warnings use the selected language as well.

Translation happens only when displaying text. The saved atlas keeps canonical
labels, geometry, seeds and identifiers; changing language is not an edit and
does not consume undo history. A programmatic render can specify
`{language: 'en'}` or `{language: 'it'}` independently of the browser preference.
English is the default for the Node renderer.

User-written labels and map titles edited in this version are explicitly marked
as custom and kept verbatim. Freehand text labels, notes, seeds, and proper names
such as Silvergate are not translated. Older files cannot distinguish a custom
name that happens to equal a stock label such as “Market”: select the object and
check **Keep label as written** in Object to preserve that spelling. Uncheck it
to restore translation of recognized stock text. Unknown imported labels are
left alone. Custom flags survive save/load and undo/redo.

### Open 2.5D without digging through Style

A **2.5D** button appears in the map header whenever a City Studio map is active.
Click it directly, or press **Shift+V** outside text fields and dialogs. The
existing **V** shortcut still selects the selection tool. The Style entry is
also retained. Legacy cities, battle maps and regions do not expose the new
shortcut because the perspective renderer requires Studio geometry.

The viewer shows the current city name, visible **+ / −** zoom buttons, rotation,
Fit, SVG/PNG export and Back to map. It remembers the last camera bearing during
the session, but fits each newly opened map. Escape returns to the map and focus
returns to the button that opened the viewer. Editing shortcuts cannot move or
delete map features behind an open viewer. The larger dialog adapts to narrow
screens. Changing language also refreshes an open projection.

In the paint wizard, first choose **Preview city**. A **2.5D preview** button then
opens that generated preview directly; it does not add a map to the atlas.
Closing it returns to the same wizard draft. Use Generate map to retain a city.

All existing limitations of 2.5D still apply: schematic heights, simplified
visibility ordering, and read-only viewing. Edit geometry in the top-down map.

### What remains for Part 2

- One **Smart buildings** brush, with archetype-specific automatic quarter
  placement, compatible explicit district paint, required-quarter accounting,
  and clear diagnostics when a sketch lacks usable space or waterfront.
- Shared special-feature placement for both normal and painted generation:
  inner fortress compounds, major temple/garden complexes, parks, large
  warehouse yards, and statue/fountain squares, with appropriate assets.

No smart brush, mandatory-quarter solver, or new landmark complex is included in
Part 1. No people or narrative content are added.

## Italiano

La Parte 1 aggiunge etichette della mappa nella lingua scelta e un accesso diretto
alla vista 2.5D esistente. Non cambia generazione, pennelli, asset o geometria.

Scegli **Italiano** o **English** nelle Impostazioni. Titoli predefiniti, quartieri,
monumenti, tipi di edificio ed etichette descrittive riconosciute cambiano lingua
anche sulla mappa, nell’ispettore, nelle ricerche e nelle esportazioni. Non serve
rigenerare le città salvate. Il file conserva il testo originale: cambiare lingua
non modifica l’atlante né la cronologia.

I nomi personalizzati, i testi liberi e le note restano come scritti. Se un nome
personalizzato di una vecchia mappa coincide con un’etichetta predefinita,
seleziona l’oggetto e attiva **Mantieni l’etichetta come scritta**. I nomi propri e
le etichette sconosciute non vengono tradotti.

Apri una mappa di Studio città e premi **2.5D** sopra la mappa, oppure
**Maiusc+V**. **V** continua ad attivare la selezione. Nella vista trovi nome della
città, zoom +/−, rotazione, Adatta vista, esportazione SVG/PNG e Torna alla mappa.
Esc chiude la vista. L’orientamento viene ricordato durante la sessione. I tasti
di modifica non cambiano la mappa mentre la vista è aperta.

Nella procedura guidata, genera **Anteprima città**, poi premi **Anteprima 2.5D**.
Chiudere la vista torna alla stessa bozza, senza aggiungere mappe all’atlante.

La Parte 2 deve ancora aggiungere il pennello **Edifici intelligenti**, la
collocazione automatica dei quartieri necessari e i complessi speciali condivisi
tra generazione normale e dipinta: fortezze interne, grandi templi con giardini,
parchi, magazzini e piazze monumentali. Nessuna persona o storia viene generata.
