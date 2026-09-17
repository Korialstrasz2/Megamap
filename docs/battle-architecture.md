# Architectural battle maps

## Start with a working plan

Choose **Build → Battle**, then a **Working plan**: dungeon garrison, family dwelling, roadside inn, fortified manor, working monastery, burial complex, undercity waterworks, living cave system or river crossing. A template replaces the room program and architecture; templates with stated dimensions also set the map size. Choose square or either hex movement grid independently of the construction plan.

**Expand planner** opens the same editor in a three-column workspace. There is no second copy of the settings. The room catalogue searches names, uses and furnishings; switch from *Recommended for this encounter* to *All rooms* to see all 52 room roles, or browse a room family.

Move rooms with the arrow buttons, drag their numbered handles, or focus a handle and press **Alt + Up/Down**. Duplicate creates another room, not additional furniture. Removing, duplicating and reordering rooms preserves the identity of adjacency references. Under **Room settings**, set a custom name, relative room size, access category, and a preferred adjoining room. Names are stored as text and escaped for display.

The first requested room is the arrival; the last is the objective. Related rooms are grouped into wings. Public, service, private and secure access influence planning; adjacency requests are preferences, not permission to force a corridor through another bedroom. Unmet adjacency requests are reported in the live preview. Click a numbered preview room to select its settings.

The limit is **24 zones**. An empty program deliberately generates one entrance room. The planner expands within the selected envelope before using a compact fallback or reporting rooms that cannot fit. Missing zones are listed by their original number; they are never silently discarded. The final objective is retained where capacity permits. **Fit map to program** enlarges dimensions, up to 80 × 80 construction cells. Ordinary generation never silently changes your chosen map dimensions.

## Architecture controls

**Architecture** separates building organisation, entrance side, passage width, furnishing density, repair condition, and an independent service entrance from the zone program.

Compact dwellings share walls and use a circulation spine. Branching dungeons add connected galleries rather than unrelated rectangular rooms joined by arbitrary lines. Courtyard plans arrange separate wings around connected walks and a central court. Axial temples align entrance, nave and inner objective with side aisles. An axial plan requires a nave; small envelopes may require a reported compact fallback. The service entrance is added only where a suitable service room has an external wall.

Doorways occupy actual wall interfaces. Room allocation, hall circulation and doors are planned before furniture. Kitchens, pantries and stores can have direct service connections when they share a wall. Every room receives a reserved dry path to its entrances. Beds, stoves, desks, storage and seating have physical footprints; placement avoids walls, water, reserved paths and other furniture. Key furnishings have role-specific caps rather than filling a bedroom with repeated beds or a kitchen with repeated stoves. Setting density to zero removes furnishings, not structural bridges.

Construction uses **5 ft orthogonal cells**, even with a hex movement grid. The building is fitted inside the selected rectangular or hexagonal play boundary before room allocation; rooms are not subsequently cropped to fit the outline. Single-file circulation is 5 ft and wider circulation 10 ft. Sewer maintenance galleries are at least 10 ft wide and include dry crossings beside water channels.

## Other encounter types

Caves use connected irregular chambers in requested depth order, a visible mouth, rock divisions and side-hollow pools that leave the travel route dry. Forest and desert encounters use continuous approaches and side clearings, with vegetation and cover outside the reserved route. River crossings include a continuous channel, a deck reaching both banks and parapets. These are distinct generators, not the same room plan with different labels.

## Appearance and editing

Top-down vector furnishings, layered wall strokes, door jambs and swings, stone courses, boards, tiled floors and outdoor surfaces are generated locally. No remote textures, image services or new runtime dependencies are required. Existing palettes, grid overlays, labels, lights, manual tools and SVG/PNG export remain available.

Generated props can be moved, rotated and resized with the editor. Their stored footprints update with those transforms; subsequent manual edits are not forced to obey generation clearances. Floor painting still supports undo, including adding rock to residential exterior ground. Wall and line-of-sight boundaries are recalculated from surviving floor interfaces. Doors remain separate openings in Universal VTT export.

## Saved maps and compatibility

The atlas format remains version 1. New battle maps include `battle.generatorVersion: 2`, room identities, shared partitions, material surfaces, circulation and water cells, connection records and diagnostics. These fields are bounded and validated on import.

Existing saved maps keep their stored geometry and use legacy rendering when architectural metadata is absent. They are not automatically regenerated. Generating again from an old seed intentionally uses the new algorithm and will not reproduce the old generic plan. Save a backup atlas before upgrading. The procedural layout is deterministic for the same seed and options.

This is a **2D procedural tabletop floor-plan generator**, not photorealistic imagery, an engineering design tool or a historical-building simulation. Impossible capacity or adjacency requests can produce explicit warnings. Universal VTT importers may ignore Megamap's hex-grid extension; verify scale and grid alignment in the receiving application. External VTT importers and Windows BAT execution are not covered by the automated tests.

## Developer verification

Run the complete engine, editor, compatibility and generation regression suite:

```sh
node --test tests/*.test.cjs
```

Browser checks use Python with Playwright installed for development only:

```sh
python tests/browser_smoke.py --output /tmp/qa-smoke
python tests/browser_v12.py --output /tmp/qa-v12
python tests/browser_battle.py --output /tmp/qa-battle
```

The default browser harness opens the actual `index.html` file with its CSP intact. `--chromium /path/to/chromium` selects a system browser. Restricted environments may use `--inline`, which embeds the local CSS/scripts and removes CSP. Inline results are not evidence of working file navigation, CSP enforcement, storage persistence or launchers.

Architecture tests cover all encounter defaults across multiple seeds; square/hex and narrow/crowded envelopes; dry reachability through real doorways with furniture present; room and prop overlap; functional household furnishings; pool placement; VTT door openings; deterministic save/restore; legacy compatibility; import validation; room identity remapping; and floor-paint boundaries. Browser checks exercise the planner, catalogue, keyboard reordering, room settings, templates, capacity limits, responsiveness, languages and exports.
