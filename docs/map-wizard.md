# New map wizard / Creazione guidata della mappa

## English

Click **New wizard** beside the MEGAMAP title. Select the map type, a preset and a seed, then work through every generator-settings section. Campaign and local regions have two settings steps; city and battle maps have three. The initial map/preset/seed step is additional.

Choices are buttons. Number and slider settings have clickable values across their allowed range, an exact numeric input, and a Random button. Booleans use Yes/No buttons. City quarter/building selections and encounter room settings are included; the existing room catalogue, duplicate/reorder controls and live plan remain available. Long room-role lists open from a button-like disclosure so the planner remains inspectable.

Use **Random** for one setting, **Random selection** for a city checklist, or **Randomize section** for all settings in the current section. On the initial step, section randomization also chooses a map type and preset. On the Encounter step, theme and working-plan randomization can load a different room program and its associated architecture/size defaults, just as selecting a working plan in the sidebar does. Randomization obeys field bounds; it is not a guarantee of a particular aesthetic or that every requested room/farm can be placed. Existing generator diagnostics still apply.

**Back**, **Skip section** and the **Sections** menu retain choices. Skip advances with current values; it does not reset a section. Invalid numeric values must be corrected before continuing. Closing or pressing Escape generates nothing and retains the current settings in the sidebar.

The last button is **Generate map**: there is no review screen. It uses the existing generation action, adds one map rather than overwriting the current map, and restores the original sidebar controls with the generated settings. Continue editing there normally. Full-atlas or generation errors retain the wizard and its settings.

The original tabbed workflow is unchanged. This wizard covers map-creation settings, not unrelated Atlas, Export or object-editing tools. It works offline with the same runtime and content-security policy as the workbench.

## Italiano

Premi **Nuova procedura guidata** accanto al titolo MEGAMAP. Scegli tipo di mappa, preimpostazione e seme; poi attraversa tutte le sezioni delle impostazioni del generatore.

Le opzioni si scelgono con pulsanti. I campi numerici hanno valori rapidi cliccabili, un valore esatto modificabile e **Casuale**. Sono inclusi quartieri, tipi di edifici e tutti i dettagli delle stanze degli scontri, con catalogo, duplicazione, riordino e anteprima.

**Casuale** cambia un campo; **Selezione casuale** cambia una lista di tipi; **Rendi casuale la sezione** cambia tutti i campi della sezione. Nella prima sezione cambia anche il tipo di mappa. Una preimpostazione dello schema degli scontri può modificare anche i valori associati di architettura e dimensione, come nel pannello originale. Restano validi gli avvisi del generatore sui vincoli di posizionamento.

**Indietro**, **Salta sezione** e **Sezioni** conservano le scelte. I valori numerici non validi devono essere corretti. Chiudere o premere Esc non genera alcuna mappa e lascia le impostazioni nella barra laterale.

L’ultimo pulsante, **Genera mappa**, crea immediatamente una nuova mappa senza schermata di riepilogo. Le impostazioni scelte tornano nella barra laterale, dove puoi perfezionarle. Il flusso originale a schede resta disponibile e il programma continua a funzionare offline.

## Developer checks

- `node --test tests/wizard.test.cjs`
- `python tests/browser_wizard.py --output /tmp/wizard-qa`
- In restricted environments only: add `--inline --chromium /usr/bin/chromium`. Inline tests do not validate local-file navigation or CSP enforcement.

`src/wizard.js` moves the original setup/options DOM trees into a modal and restores them afterward. It does not clone generator inputs or maintain a parallel options model. Button actions dispatch the existing input/change events. The optional module owns its English/Italian wizard copy and reads the shared language preference; existing field names continue to use `MegamapI18n`. Numeric helper functions also export through CommonJS for dependency-free Node tests.
