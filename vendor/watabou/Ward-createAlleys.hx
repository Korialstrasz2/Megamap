// Excerpt from Oleg Dolya / Watabou's TownGeneratorOS, Ward.hx.
// GNU GPL v3. Original algorithm; source is recorded in README.md.
// Not a standalone compilable Haxe class.
public static function createAlleys( p:Polygon, minSq:Float, gridChaos:Float, sizeChaos:Float, emptyProb:Float=0.04, split=true ):Array<Polygon> {
    // Looking for the longest edge to cut it
    var v:Point = null;
    var length = -1.0;
    p.forEdge( function( p0, p1 ) {
        var len = Point.distance( p0, p1 );
        if (len > length) {
            length = len;
            v = p0;
        }
    } );
    var spread = 0.8 * gridChaos;
    var ratio = (1 - spread) / 2 + Random.float() * spread;
    // Trying to keep buildings rectangular even in chaotic wards
    var angleSpread = Math.PI / 6 * gridChaos * (p.square < minSq * 4 ? 0.0 : 1);
    var b = (Random.float() - 0.5) * angleSpread;
    var halves = Cutter.bisect( p, v, ratio, b, split ? ALLEY : 0.0 );
    var buildings = [];
    for (half in halves) {
        if (half.square < minSq * Math.pow( 2, 4 * sizeChaos * (Random.float() - 0.5) )) {
            if (!Random.bool( emptyProb ))
                buildings.push( half );
        } else {
            buildings = buildings.concat( createAlleys( half, minSq, gridChaos, sizeChaos, emptyProb, half.square > minSq / (Random.float() * Random.float()) ) );
        }
    }
    return buildings;
}
