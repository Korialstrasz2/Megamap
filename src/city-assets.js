/* Original, bounded top-down city detail stamps. GPL-3.0-only.
 * Bodies use the same palette tokens as the existing offline asset catalog.
 * No inhabitants or narrative content. The height is only a 2.5D display hint.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.MegamapCityAssets=api;root.MegamapI18n?.register(api.IT);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const definitions=[
 ['city-net-racks','Fishing net racks','Rastrelliere per reti',7,1.8,'<path d="M-20-17H20V17H-20Z" fill="@sand"/><path d="M-18-14H18M-18 0H18M-18 14H18" stroke="@roof" stroke-width="2.5"/><path d="M-16-13L12 13M-8-13L18 11M0-13L18 5M8-13L18-3M16-13L18-11M-18-7L4 13M-18 1L-4 13M-18 9L-12 13M-16 13L12-13M-8 13L18-11M0 13L18-5M8 13L18 3M16 13L18 11M-18 7L4-13M-18-1L-4-13M-18-9L-12-13" fill="none" stroke-width=".55" opacity=".6"/>'],
 ['city-boat-slip','Boatbuilding cradle','Culla di costruzione navale',12,1.5,'<rect x="-14" y="-22" width="28" height="44" fill="@sand"/><path d="M-11-22V22M11-22V22" stroke="@roof" stroke-width="3"/><path d="M-17-15H17M-17-5H17M-17 5H17M-17 15H17" stroke="@roof" stroke-width="2"/><path d="M0-21Q-14-9-8 15L0 22L8 15Q14-9 0-21ZM0-20V21M-7-8H7M-9 0H9M-8 8H8" fill="none" stroke-width="1.4"/>'],
 ['city-capstan','Harbor capstan','Argano portuale',5,1.8,'<circle r="21" fill="@hill"/><circle r="16" fill="@sand"/><path d="M-18 0H18M0-18V18M-13-13L13 13M-13 13L13-13" stroke="@roof" stroke-width="2"/><circle r="7" fill="@roof"/><circle r="3" fill="@paper"/>'],
 ['city-ropewalk','Rope-making yard','Corderia all’aperto',16,2,'<rect x="-9" y="-23" width="18" height="46" fill="@sand"/><path d="M-7-20V20M0-20V20M7-20V20" stroke="@roof" stroke-width="1.2"/><path d="M-14-20H14M-14 20H14" stroke-width="3"/><circle cx="-7" cy="-20" r="2" fill="@hill"/><circle cy="-20" r="2" fill="@hill"/><circle cx="7" cy="-20" r="2" fill="@hill"/><rect x="-12" y="-2" width="24" height="4" fill="@roof"/>'],
 ['city-assembly-stones','Assembly stone benches','Sedili dell’assemblea',12,1.2,'<circle r="22" fill="@grass"/><path d="M-17-8A19 19 0 0 1 17-8M-17 8A19 19 0 0 0 17 8" fill="none" stroke="@hill" stroke-width="5"/><path d="M-11-4A12 12 0 0 1 11-4M-11 4A12 12 0 0 0 11 4" fill="none" stroke="@paper" stroke-width="3"/><circle r="4" fill="@hill"/><path d="M-22 0H-7M7 0H22" stroke="@sand" stroke-width="4"/>'],
 ['city-runestone','Carved standing stone','Pietra eretta incisa',4,3.5,'<path d="M-15 12L-10-16L1-22L13-13L16 14L0 21Z" fill="@hill"/><path d="M-8 10V-11L2-4L-8 0M5-13V12M5-9L11-5M5 2L-1 6M5 2L11 7" fill="none" stroke-width="1.5"/><path d="M-10-16L-6-13L-8 14L0 21" fill="none" stroke="@paper"/>'],
 ['city-forge-yard','Kiln and forge yard','Cortile di forno e forgia',9,3,'<rect x="-22" y="-21" width="44" height="42" fill="@sand"/><circle cx="-10" cy="-8" r="10" fill="@hill"/><circle cx="-10" cy="-8" r="5" fill="@ink"/><path d="M-15 1H-5V8H-15Z" fill="@roof"/><path d="M3-17H20V-10H3M3-7H20M3-3H20" fill="@roof"/><path d="M0 7H17L12 12H5L2 17H14" fill="@hill" stroke-width="2"/>'],
 ['city-cloister-herbs','Cloister herb beds','Aiuole del chiostro',12,.6,'<rect x="-22" y="-22" width="44" height="44" fill="@sand"/><path d="M-18-18H-3V-3H-18ZM3-18H18V-3H3ZM-18 3H-3V18H-18ZM3 3H18V18H3Z" fill="@grass"/><path d="M-15-15H-6M-15-10H-6M6-15H15M6-10H15M-15 6H-6M-15 11H-6M6 6H15M6 11H15" stroke="@forest" stroke-width="2"/><circle r="3" fill="@water"/>'],
 ['city-pergola','Vine pergola','Pergolato di vite',8,2.8,'<rect x="-21" y="-17" width="42" height="34" fill="@grass"/><path d="M-18-20V20M18-20V20M-21-14H21M-21-7H21M-21 0H21M-21 7H21M-21 14H21" stroke="@roof" stroke-width="2"/><path d="M-15-18Q-7-4-13 6T-8 19M14-18Q3-4 11 7T5 18" fill="none" stroke="@forest" stroke-width="4"/>'],
 ['city-cistern','Octagonal cistern','Cisterna ottagonale',8,1.2,'<path d="M-10-22H10L22-10V10L10 22H-10L-22 10V-10Z" fill="@paper"/><path d="M-8-15H8L15-8V8L8 15H-8L-15 8V-8Z" fill="@water"/><path d="M-22-10L-15-8M22-10L15-8M-10 22L-8 15M10-22L8-15" stroke="@hill"/><rect x="-5" y="-5" width="10" height="10" fill="@hill"/>'],
 ['city-caravan-yard','Caravan loading court','Corte di carico carovaniera',16,2.5,'<rect x="-23" y="-22" width="46" height="44" fill="@sand"/><path d="M-20-18H-11V18H-20ZM11-18H20V18H11Z" fill="@roof"/><path d="M-20-6H-11M-20 6H-11M11-6H20M11 6H20" stroke="@paper"/><rect x="-7" y="-18" width="14" height="6" fill="@water"/><path d="M-5 4H5V14H-5ZM-8 2V16M8 2V16" fill="@hill"/>'],
 ['city-covered-bazaar','Shaded market stalls','Bancarelle coperte',12,2.6,'<rect x="-23" y="-22" width="46" height="44" fill="@sand"/><path d="M-21-19H-5V-3H-21ZM5-19H21V-3H5ZM-21 3H-5V19H-21ZM5 3H21V19H5Z" fill="@paper"/><path d="M-17-19V-3M-9-19V-3M9-19V-3M17-19V-3M-17 3V19M-9 3V19M9 3V19M17 3V19" stroke="@roof" stroke-width="3"/>'],
 ['city-observatory-dais','Astral observatory dais','Pedana dell’osservatorio astrale',10,4,'<circle r="22" fill="@hill"/><circle r="18" fill="@paper"/><circle r="12" fill="none" stroke="@roof" stroke-width="2"/><ellipse rx="5" ry="16" fill="none" stroke="@roof" stroke-width="2" transform="rotate(35)"/><path d="M-19 0H19M0-19V19" stroke-dasharray="2 3"/><circle r="3" fill="@water"/>'],
 ['city-relic-garden','Excavated relic garden','Giardino dei reperti',14,1.5,'<path d="M-22-22H22V22H-22Z" fill="@grass"/><path d="M-17-14H2V-5H16V15H6V5H-17Z" fill="@hill"/><path d="M-15-11H0M3-2L12-1M13 4V12M-12 3H1" stroke="@paper" stroke-width="2"/><path d="M-22 12Q-3 24 22-9" stroke="@sand" stroke-width="4" fill="none"/>'],
 ['city-cargo-scales','Cargo weighbridge','Pesa delle merci',7,3,'<rect x="-21" y="-18" width="42" height="36" fill="@sand"/><path d="M0-19V18M-20-10H20" stroke="@roof" stroke-width="2.8"/><path d="M-13-10L-20 7H-6ZM13-10L6 7H20Z" fill="@hill"/><path d="M-20 7Q-13 15-6 7M6 7Q13 15 20 7" fill="@paper"/><circle cy="-10" r="3" fill="@roof"/>'],
 ['city-arcade-court','Colonnaded court','Corte colonnata',16,4,'<rect x="-23" y="-22" width="46" height="44" fill="@paper"/><rect x="-14" y="-13" width="28" height="26" fill="@sand"/><path d="M-18-16H18V16H-18Z" fill="none" stroke="@hill" stroke-width="3"/><path d="M-18-16H18M-18 16H18M-18-16V16M18-16V16" stroke="@paper" stroke-width="3" stroke-dasharray="2 6"/><circle r="5" fill="@water"/>']
];
definitions.push(...[
 [
  "city-guard-post",
  "Citadel guard post",
  "Posto di guardia della cittadella",
  6,
  4,
  "<rect x=\"-20\" y=\"-16\" width=\"40\" height=\"32\" fill=\"@hill\"/><path d=\"M-17-13H17V13H-17Z\" fill=\"@roof\"/><path d=\"M0-13V13M-17-13L0-4L17-13\" fill=\"none\"/><path d=\"M-5 13H5V20H-5\" fill=\"@sand\"/>"
 ],
 [
  "city-temple-steps",
  "Processional temple steps",
  "Scalinata processionale del tempio",
  9,
  1.5,
  "<path d=\"M-22 20H22V12H18V4H14V-4H10V-20H-10V-4H-14V4H-18V12H-22Z\" fill=\"@paper\"/><path d=\"M-22 14H22M-18 6H18M-14-2H14M-10-10H10\" fill=\"none\" stroke=\"@hill\" stroke-width=\"1.4\"/>"
 ],
 [
  "city-parterre",
  "Formal city parterre",
  "Parterre urbano formale",
  12,
  0.7,
  "<rect x=\"-23\" y=\"-23\" width=\"46\" height=\"46\" fill=\"@sand\"/><path d=\"M-19-19H-3V-3H-19ZM3-19H19V-3H3ZM-19 3H-3V19H-19ZM3 3H19V19H3Z\" fill=\"@forest\"/><path d=\"M-15-15H-7V-7H-15ZM7-15H15V-7H7ZM-15 7H-7V15H-15ZM7 7H15V15H7Z\" fill=\"@grass\"/><circle r=\"2\" fill=\"@paper\"/>"
 ],
 [
  "city-statue-plinth",
  "Civic statue and plinth",
  "Statua civica e piedistallo",
  7,
  5,
  "<circle r=\"22\" fill=\"@sand\"/><rect x=\"-14\" y=\"-14\" width=\"28\" height=\"28\" fill=\"@hill\"/><rect x=\"-9\" y=\"-9\" width=\"18\" height=\"18\" fill=\"@paper\"/><path d=\"M-4 7L-6-5L-3-12L3-12L6-5L4 7Z\" fill=\"@mountain\"/><circle cy=\"-12\" r=\"4\" fill=\"@paper\"/><path d=\"M-17 16H17M-16-17H16\" stroke=\"@roof\" stroke-width=\"1.5\"/>"
 ],
 [
  "city-grand-fountain",
  "Great civic fountain",
  "Grande fontana civica",
  10,
  3,
  "<path d=\"M-10-23H10L23-10V10L10 23H-10L-23 10V-10Z\" fill=\"@paper\"/><circle r=\"16\" fill=\"@water\"/><circle r=\"9\" fill=\"@hill\"/><circle r=\"6\" fill=\"@water\"/><circle r=\"2.5\" fill=\"@paper\"/><path d=\"M-12 0H-8M8 0H12M0-12V-8M0 8V12\" stroke=\"@paper\" stroke-width=\"1.7\"/>"
 ],
 [
  "city-dock-crane",
  "Timber dock crane",
  "Gru portuale di legno",
  10,
  9,
  "<rect x=\"-15\" y=\"-17\" width=\"30\" height=\"34\" fill=\"@sand\"/><circle cx=\"-5\" cy=\"4\" r=\"11\" fill=\"@roof\"/><circle cx=\"-5\" cy=\"4\" r=\"7\" fill=\"@paper\"/><path d=\"M-16 4H6M-5-7V15\" stroke=\"@roof\" stroke-width=\"2\"/><path d=\"M-5 4L18-19L22-15L-1 8Z\" fill=\"@roof\"/><path d=\"M19-17V3q0 5-4 3\" fill=\"none\" stroke-width=\"1.7\"/>"
 ],
 [
  "city-warehouse-cargo",
  "Warehouse cargo stacks",
  "Cataste di merci dei magazzini",
  12,
  2.8,
  "<rect x=\"-23\" y=\"-23\" width=\"46\" height=\"46\" fill=\"@sand\"/><path d=\"M-20-19H-4V-3H-20ZM1-19H20V-3H1ZM-20 3H-2V20H-20Z\" fill=\"@roof\"/><path d=\"M-20-19L-4-3M-20-3L-4-19M1-19L20-3M1-3L20-19M-20 3L-2 20M-20 20L-2 3\" stroke=\"@paper\" stroke-width=\"1.2\"/><circle cx=\"8\" cy=\"8\" r=\"5\" fill=\"@hill\"/><circle cx=\"15\" cy=\"17\" r=\"5\" fill=\"@hill\"/>"
 ],
 [
  "city-park-pavilion",
  "Park pavilion",
  "Padiglione del parco",
  10,
  5,
  "<path d=\"M-10-22H10L22-10V10L10 22H-10L-22 10V-10Z\" fill=\"@paper\"/><path d=\"M-7-16H7L16-7V7L7 16H-7L-16 7V-7Z\" fill=\"@roof\"/><path d=\"M0 0L-7-16M0 0L7-16M0 0L16-7M0 0L16 7M0 0L7 16M0 0L-7 16M0 0L-16 7M0 0L-16-7\" fill=\"none\" stroke=\"@paper\"/><circle r=\"3\" fill=\"@hill\"/>"
 ],
 [
  "city-market-arcade",
  "Market arcade",
  "Porticato del mercato",
  12,
  4,
  "<rect x=\"-22\" y=\"-17\" width=\"44\" height=\"34\" fill=\"@sand\"/><path d=\"M-22-17H22V0H-22Z\" fill=\"@roof\"/><path d=\"M-22-8H22\" stroke=\"@paper\"/><path d=\"M-18 0V16M-6 0V16M6 0V16M18 0V16\" stroke=\"@hill\" stroke-width=\"3\"/><path d=\"M-18 14Q-12 5-6 14Q0 5 6 14Q12 5 18 14\" fill=\"none\" stroke-width=\"1.5\"/>"
 ],
 [
  "city-granary-silos",
  "Raised grain stores",
  "Granai rialzati",
  11,
  6,
  "<rect x=\"-23\" y=\"-21\" width=\"46\" height=\"42\" fill=\"@sand\"/><path d=\"M-20-18H-3V18H-20ZM3-18H20V18H3Z\" fill=\"@roof\"/><path d=\"M-12-18V18M12-18V18\" stroke=\"@paper\"/><path d=\"M-20-12H-3M-20 12H-3M3-12H20M3 12H20\" stroke=\"@hill\" stroke-width=\"2\"/>"
 ]
]);
const assets=definitions.map(([id,name,it,meters,heightM,body])=>({id,name,category:'City details',tags:'city studio architecture '+name.toLowerCase(),body,meters,heightM}));
const IT=Object.fromEntries([['City details','Dettagli città'],...definitions.map(d=>[d[1],d[2]])]);
return{assets,IT};
});
