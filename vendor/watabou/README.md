# Watabou provenance

Upstream: https://github.com/watabou/TownGeneratorOS
Inspected tree: 7fbc87a9398cc508af24de93f79cf2ad027f352b
Original author: Oleg Dolya (Watabou)
License: GNU GPL version 3; see ../../LICENSE.
Source path: Source/com/watabou/towngenerator/wards/Ward.hx
Inspected file blob: cfc4f1836c56277f768a2e01c46ba178b1f10576

Megamap's `createAlleys` in src/engine.js is a JavaScript adaptation of the
public `Ward.createAlleys` method reproduced in Ward-createAlleys.hx.
The longest-edge selection, randomized cut ratio, angular jitter, stochastic
building size, vacancy and recursive subdivision derive from that method.
Megamap supplies independent geometry routines and adds explicit recursion,
minimum-size and split-failure guards. It is not a port of the whole program.

The remaining region, routing, editor, battlemap, renderer and asset code is
new code. This folder is not a complete checkout of TownGeneratorOS and
contains none of Watabou's private/current proprietary implementation.
There is no claimed feature parity with the current online generator and
no affiliation with or endorsement by Watabou. The original public source
was chosen as an attributable algorithmic base, not established as the
objectively 'best' fork through comparative testing.
