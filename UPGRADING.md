## City Studio addition

The new **Build → City Studio** tool is independent. **City · legacy** keeps the previous generator, and old saved geometry is never regenerated on load. New Studio maps use additive `cityStudio.version: 1` metadata with the existing atlas format. Older builds do not understand Studio rendering. Save an atlas backup and extract the complete updated package before using the new tool. See `docs/city-studio.html`.

# Upgrading to Megamap 1.2

1. In the older application, **Save atlas**. Keep this file and the old folder untouched.
2. Extract the whole v1.2 ZIP into a separate folder.
3. Open `START_MEGAMAP.bat` (or `index.html`), choose **Open** and load the saved atlas.
4. Review every map, its layer visibility, notes and imported art. Save the upgraded atlas under a new filename.
5. Use **Build** to generate a new city, local survey or hex encounter. Generation adds a map and does not overwrite the imported map.

Existing v1 geometry is retained. A round v1 city stays round until a new city is generated; new shape controls are not an automatic conversion or destructive crop. Regenerating one old district explicitly applies a v1.2 quarter program inside that district. v0.1 ward links are repaired by containment where possible.

Schema version 1 remains in use because the v1.2 fields are additive, but old application versions may not understand new local terrain and grid types. Backward reading of a v1.2 atlas by v1/v0.1 is not promised. Keep original backups.

A seed reproduces generation within one engine version, not across releases. City generation is intentionally changed. Old campaign-region generation remains available unchanged; local surveys are a separate map mode. Import preserves stored geometry rather than rerunning a seed.

Autosave cannot be assumed to transfer across folders, browsers or profiles. The single workbench reads the previous V1 local autosave once, when no newer local autosave exists, and copies it forward on the next autosave; the old record is left untouched. Explicit Save/Open remains the supported migration path. Undo history, unsaved paths and live selection are not portable project data.
