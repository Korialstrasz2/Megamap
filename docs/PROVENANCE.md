# Provenance, architecture and validation

## What was reused

The upstream selected for attribution is **Watabou / TownGeneratorOS**, tree
`7fbc87a9398cc508af24de93f79cf2ad027f352b`. Its README and source were inspected
through the GitHub connector. The public README explicitly says this source
snapshot lacks later features. No access to current private code was available.

Only `Ward.createAlleys` was adapted into this release. The public Haxe method
is included in `vendor/watabou/Ward-createAlleys.hx`, with source path, commit,
blob identity and author attribution. The Javascript adaptation appears in
`src/engine.js`. It retains longest-edge cutting, variable split position,
angular jitter, stochastic parcel size and vacancy. Megamap adds recursion
limits, degenerate-input checks, minimum polygon area and split-failure guards.

This is an algorithm-derived project, **not a full fork/check-out** of
TownGeneratorOS, and it is not derived from an unverified third-party
TypeScript project. No claim is made that a comparative evaluation established
this upstream as the best of all available forks. The previous suggestion to
use a particular third-party fork should not be interpreted as implemented.

Upstream: https://github.com/watabou/TownGeneratorOS
Original author: Oleg Dolya / Watabou.
License: GNU GPL v3. The entire supplied Megamap source release uses GPL v3.
The included GPL text is in `LICENSE`.

## Current release

Megamap v1.2 adds guided concave city envelopes, quarter/building programs, physical local-region elevations and hex battle grids/boundaries to the v1 workbench. These additions are Megamap code, not a newly obtained Watabou implementation. See CHANGELOG.md. See ARCHITECTURE.md for current module descriptions and TEST_RESULTS.txt for the tests actually performed. Earlier v0.1 test counts are not the verification record for this release.
