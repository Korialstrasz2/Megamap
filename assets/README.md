# Megamap 1.2 vector library

**246 distinct SVG symbols in 12 categories.** V1.2 adds **103 symbols** to the previous 143: **37 Quarter rooftops, 41 Quarter details and 25 Local landscape** assets. Counts refer to distinct symbol definitions, not recolored duplicates.

Open `catalog.html` for searchable previews; `catalog.json` contains metadata and stable IDs. `svg/` contains 246 standalone 256-pixel SVG wrappers with transparent backgrounds and vector geometry. The application uses the same source definitions embedded at rendering time, so it does not load hundreds of external SVG files during startup.

Quarter rooftops are top-down and used by city building programs: roofs are rotated, stretched to lot bounds and clipped to actual building polygons. Decorative roofs are not interiors. Quarter details distinguish trade, temple, military, noble, academic, industrial, garden, necropolis and other areas. The Local landscape symbols depict terrain and land-cover patches, not measured footprints at regional scale.

The retained categories are Nature, Buildings, Infrastructure, Camp & travel, Interiors, Dungeon, Maritime, Markers and Footprints. Pictorial landmarks and top-down props are intentionally mixed across categories for different map scales; not every symbol suits every scale.

All symbols respond to the six map palettes. Standalone files use Field Atlas. No external art packs, photographs, bitmap fonts or Watabou illustrations are distributed. Imported user artwork retains its owner's terms.

Source: `../src/assets.js` and `../src/render.js`. Regenerate the catalog and standalone files with `node scripts/build-assets.cjs` from the project root. No rebuild is needed for normal use.

Code and bundled artwork: **GNU GPL version 3 only**; see `../LICENSE` and `../NOTICE`. The 103 additions are listed in `../docs/NEW_ASSETS_V12.json`.
