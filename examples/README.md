# Example maps

## New in 1.2

Open **V1.2-showcase.megamap.json** through the application's Open button. It contains eight maps:

| Map | Demonstrates |
| --- | --- |
| Copper Elbow | Exact L-shaped city, seven selected quarter types, varied rooftops. |
| Greywall | Enforced rectangular planned town with a restricted building whitelist. |
| Forked College | T-shape with guidance 72 and rotated, irregular perimeter. |
| Greenwood | 20 × 20 km local woodland; no roads, farms or villages; 125 m height samples. |
| High Pass | 10 × 10 km mountain survey, mean 1,850 m, relief 1,700 m, trail and caves. |
| Red Sands | 20 × 20 km desert landscape without roads or surface water. |
| Woodland encounter | Pointy-top movement grid and pointy-top outer hex boundary. |
| Broken sanctuary | Flat-top grid and boundary with orthogonal ruin-floor geometry. |

Three `V12-*.svg` files are corresponding example map exports. `V12-High-Pass-elevations.csv` contains the High Pass local elevation samples, in metres, without a geographic CRS. `V12-pointy-hex-grid.json` records its associated encounter grid geometry.

Rebuild these files with `npm run examples` or `node scripts/build-v12-examples.cjs`. No runtime dependencies or rebuild are needed to use the shipped examples.

## Preserved v1 examples

**Starter-atlas.megamap.json** (four maps) and **Ten-encounters.megamap.json** are retained unchanged from v1. The older Silver Vale / Silvergate / Wayfarer's Rest / Under the Bell exports remain as well. These demonstrate import compatibility, not v1.2 city envelopes or local terrain. The older `.dd2vtt` is sample output, not a verified external-VTT scene.

Opening any atlas replaces the current atlas after validation and confirmation when needed; **save your work first**. Use Export → Merge maps to append examples instead. The 30-map atlas limit still applies.
