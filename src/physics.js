/*CORE_START*/
function makeCore(){
"use strict";
/* Units: physics runs in SI (meters, kg, seconds). Rendering uses "units": U units = 1 meter. */
var U = 51;
var G = 9.81;
var K = {
  U: U, TRACK_DEPTH: 320, WHEEL_R: 22, START_X: 4*U, END_FLAT: 30*U, TIME_SCALE: 1,
  VIS_OFF: 0.62,               // visual body origin sits this far above the bike CoM (bike frame, m)
  R: 0.43,                     // wheel radius incl. tyre (m)
  M_BIKE: 102, I_BIKE: 18,     // kg, kg·m² (pitch, about bike CoM)
  M_RIDER: 75,
  I_REAR: 1.25, I_FRONT: 0.75, // wheel + drivetrain rotational inertia
  REAR:  { mount:[-0.69, 0.15], axis:[0,-1],           Lmax:0.44, travel:0.31, k:9800, cC:700, cR:1150 },
  FRONT: { mount:[0.47, 0.23],  axis:[0.4384,-0.8988], Lmax:0.57, travel:0.30, k:7600, cC:560, cR:950 },
  K_BUMP: 160000, C_BUMP: 3500,
  RIDER_P0: [-0.03, 0.53], RIDER_SHIFT: 0.30, RIDER_K: 38000, RIDER_C: 2300,
  HEAD: [0.10, 0.80], HEAD_R: 0.14,
  BODY_PTS: [
    { n:'skid',  p:[0.02,-0.17] },
    { n:'rear',  p:[-1.08,0.39] },
    { n:'seat',  p:[-0.55,0.45] },
    { n:'bar',   p:[0.40,0.73], fatal:true },
    { n:'front', p:[0.98,0.18] }
  ],
  CDA: 0.75, RHO: 1.2, CRR: 0.018,
  DT: 1/240
};

var TRACKS = [
  // motocross: long laps with hills and big jumps
  { id:0, mode:"mx", name:"Poeira Vermelha", seed:918273, theme:0, rivalSpeed:16.02, rivalName:"Zeca", gold:78.2, gen:{ len:1000, gap:[16,22], h:[1.8,2.6], hill:4 } },
  { id:1, mode:"mx", name:"Vale do Eco", seed:55123, theme:1, rivalSpeed:19.5, rivalName:"Bia Turbo", gold:83.3, gen:{ len:1120, gap:[18,25], h:[2.0,2.9], hill:6 } },
  { id:2, mode:"mx", name:"Serra Negra", seed:777001, theme:2, rivalSpeed:22.45, rivalName:"Lobo", gold:91.5, gen:{ len:1240, gap:[20,28], h:[2.2,3.2], hill:8 } },
  { id:3, mode:"mx", name:"Noite de Lua", seed:31337, theme:3, rivalSpeed:21.86, rivalName:"Sombra", gold:96.9, gen:{ len:1360, gap:[22,31], h:[2.4,3.5], hill:10 } },
  { id:4, mode:"mx", name:"Cânion Final", seed:240901, theme:4, rivalSpeed:32.53, rivalName:"Rei do Barro", gold:100.4, gen:{ len:1480, gap:[24,34], h:[2.6,3.8], hill:12 } },
  // special: a hillside national track inspired by a famous Michigan circuit (profile only, no corners)
  { id:5, mode:"mx", name:"Michigan", seed:1992, meters:1310, jumps:6, tables:3, rollers:1, h:[2,3], theme:5, rivalSpeed:30.31, rivalName:"Buck", gold:78.9, free:true, layout:[
      // relief from the real terrain (heightmap 200–247 m): the start sits mid-slope (~231 m), the east side by
      // the woods is the low ground (~214 m) and the west side is the high plateau (~239 m)
      ['flat', 40],                                   // start straight
      ['table', 1.8, 10],
      ['flat', 10],
      ['hill', -9, 70, 0.045],                         // first drop towards the woods, braking bumps
      ['jump', { h:2.0, gap:14 }],
      ['hill', -8, 60, 0.045],                         // down to the low ground (-17 m)
      ['flat', 12],
      ['jump', { h:1.6, gap:11 }],                    // rhythm along the woods
      ['jump', { h:1.6, gap:11 }],
      ['flat', 46],                                   // S-turn run-in to the big one
      ['jump', { h:3.4, deg:27, gap:36, valley:-2.5, landTop:4.8, landDeg:16, after:2.0, big:true, name:'O Salto do Vale' }],
      ['flat', 10],
      ['hill', 12, 90],                               // climb up the hillside
      ['flat', 16],
      ['table', 2.6, 16, true],                       // huge tabletop on the way up
      ['flat', 12],
      ['hill', 11, 80],                               // up onto the high plateau (+8 m)
      ['flat', 20],
      ['jump', { h:2.2, gap:15 }],
      ['flat', 16],
      ['hill', -20, 150, 0.045],                       // long descent: crossing sides
      ['flat', 16],
      ['rollers', 10, 4.0, 0.6],                      // long set of sand rollers in the low ground
      ['flat', 22],
      ['hill', 12, 90],                               // climb to the ski jump
      ['ski', { h:0.9, drop:6, len:40 }],             // launch off the crest, land down the hill
      ['flat', 16],
      ['hill', 6, 50],                                // back up to the start level
      ['flat', 16],
      ['table', 2.4, 14, true]                        // finish-line tabletop
  ] },
  // supercross: stadium floor, rhythm lanes, whoops, step-ups and triples
  { id:6, mode:"sx", name:"Arena Relâmpago", seed:6101, theme:6, rivalSpeed:11.9, rivalName:"Faísca", gold:59.4, gen:{ len:540, gap:[8,16.0], h:[1.3,1.8], triple:0.25, whoops:[10,14] } },
  { id:7, mode:"sx", name:"Estádio do Trovão", seed:6202, theme:7, rivalSpeed:12.41, rivalName:"Turbo Jr", gold:67.7, gen:{ len:590, gap:[8,17.5], h:[1.3,1.9], triple:0.33, whoops:[10,15] } },
  { id:8, mode:"sx", name:"Arena Neon", seed:6303, theme:8, rivalSpeed:16.02, rivalName:"Neon", gold:66.5, gen:{ len:640, gap:[8,19.0], h:[1.3,2.0], triple:0.41, whoops:[10,16] } },
  { id:9, mode:"sx", name:"Domo de Aço", seed:6404, theme:8, rivalSpeed:11.3, rivalName:"Ferro", gold:81.2, gen:{ len:690, gap:[8,20.5], h:[1.3,2.1], triple:0.49, whoops:[10,17] } },
  { id:10, mode:"sx", name:"Grande Final", seed:6505, theme:6, rivalSpeed:30.71, rivalName:"Campeão", gold:71.7, gen:{ len:740, gap:[8,22.0], h:[1.3,2.2], triple:0.57, whoops:[10,18] } },
  // hard enduro: steep climbs, logs, rock ledges and rock gardens
  { id:11, mode:"he", name:"Pedreira", seed:7101, theme:9, rivalSpeed:18, rivalName:"Cabra", gold:77.8, techPace:1.08, gen:{ len:520, climb:[4,8], ang:[16,22], step:[0.30,0.55], rock:[0.18,0.30], maxLevel:12 } },
  { id:12, mode:"he", name:"Trilha das Raízes", seed:7202, theme:1, rivalSpeed:18, rivalName:"Raiz", gold:77.4, techPace:1.089, gen:{ len:590, climb:[6,12], ang:[18,24], step:[0.38,0.65], rock:[0.21,0.34], maxLevel:18 } },
  { id:13, mode:"he", name:"Serra dos Degraus", seed:7303, theme:2, rivalSpeed:18, rivalName:"Degrau", gold:88.5, techPace:1.235, gen:{ len:660, climb:[8,16], ang:[20,26], step:[0.46,0.75], rock:[0.24,0.38], maxLevel:24 } },
  { id:14, mode:"he", name:"Cânion de Pedra", seed:7434, theme:4, rivalSpeed:18, rivalName:"Escorpião", gold:99.2, techPace:1.244, gen:{ len:730, climb:[10,20], ang:[22,28], step:[0.54,0.85], rock:[0.27,0.42], maxLevel:30 } },
  { id:15, mode:"he", name:"Montanha de Ferro", seed:7505, theme:9, rivalSpeed:18, rivalName:"Titã", gold:102.3, techPace:1.329, gen:{ len:800, climb:[12,24], ang:[24,30], step:[0.62,0.95], rock:[0.30,0.46], maxLevel:36 } },
];

var UPGRADES = {
  engine:     { name:"Motor",      costs:[40,80,140,220] },
  suspension: { name:"Suspensão",  costs:[30,70,120,200] },
  tires:      { name:"Pneus",      costs:[30,60,110,180] }
};

function bikeStats(up){
  up = up || {engine:0,suspension:0,tires:0};
  return {
    power:  27000 * (1 + 0.10*up.engine),   // W at the wheel
    tmax:   560   * (1 + 0.08*up.engine),   // N·m at the rear wheel (low gear)
    wmax:   (30 + 1.2*up.engine) / K.R,     // rev limiter as wheel speed
    brakeF: 950, brakeR: 420,               // N·m
    mu:     1.0 + 0.07*up.tires,
    damp:   1 + 0.14*up.suspension,
    travel: 0.025*up.suspension
  };
}

/* ---------------- track (built in meters, exported in units) ---------------- */
/* ---- procedural layouts: motocross (big jumps + hills), supercross (flat stadium, rhythm + whoops),
        hard enduro (steep climbs, logs, rock steps, rock gardens) ---- */
function genLayout(def, rand, rr){
  var g = def.gen, L = [], dist = 0, level = 0, pick = function(){ return rand(); };
  function add(st, len){ L.push(st); dist += len; }
  if (def.mode === 'sx'){
    add(['flat', 34], 34);
    add(['table', rr(1.6, 2.0), rr(10, 14)], 30);                          // start-straight table
    var guard = 0;
    while (dist < g.len && guard++ < 200){
      var r0 = pick();
      if (r0 < 0.34){                                                     // rhythm lane: doubles and triples back to back
        var n = 3 + Math.floor(rand()*3);
        for (var i=0;i<n;i++){
          var tri = rand() < g.triple, h = rr(g.h[0], g.h[1]);
          var gap = tri ? rr(g.gap[1]*0.8, g.gap[1]) : rr(g.gap[0], g.gap[0] + 3);
          add(['jump', { h:h, gap:gap, deg:rr(26, 30) }], gap + 16);
          add(['flat', rr(1, 4)], 3);
        }
        add(['flat', rr(8, 14)], 11);                                     // (a turn in the real thing)
      } else if (r0 < 0.52){
        add(['flat', rr(10, 16)], 13);
        add(['rollers', g.whoops[0] + Math.floor(rand()*(g.whoops[1] - g.whoops[0])), rr(3.0, 3.5), rr(0.5, 0.62), 12], 40);   // whoops
        add(['flat', rr(8, 12)], 10);
      } else if (r0 < 0.68){                                              // step-up onto a plateau and back down
        var sh = rr(1.4, 1.9);
        add(['flat', rr(12, 18)], 15);
        add(['jump', { h:sh, gap:rr(6, 9), deg:28, landTop:sh + rr(1.2, 1.8), landDeg:16 }], 26);
        add(['flat', rr(8, 12)], 10);
      } else if (r0 < 0.82){                                              // big triple on its own
        add(['flat', rr(18, 26)], 22);
        var th = rr(g.h[1], g.h[1] + 0.5);
        add(['jump', { h:th, gap:rr(g.gap[1], g.gap[1] + 4), deg:28 }], g.gap[1] + 20);
        add(['flat', rr(8, 12)], 10);
      } else {                                                            // on-off table
        add(['flat', rr(8, 14)], 11);
        add(['table', rr(1.6, 2.2), rr(6, 10)], 22);
        add(['flat', rr(4, 8)], 6);
      }
    }
    add(['flat', 20], 20);
    add(['jump', { h:g.h[1], gap:g.gap[1] + 2, deg:28 }], g.gap[1] + 22);    // finish-line jump
    return L;
  }
  if (def.mode === 'he'){
    add(['flat', 30], 30);
    var guard2 = 0;
    while (dist < g.len && guard2++ < 300){
      var r1 = pick();
      if (r1 < 0.26){                                                     // steep climb (sometimes rocky)
        var dy = rr(g.climb[0], g.climb[1]), ang = rr(g.ang[0], g.ang[1]), len = 1.5*dy/Math.tan(ang*Math.PI/180);
        if (level + dy > g.maxLevel) dy = -dy;
        len = 1.5*Math.abs(dy)/Math.tan(ang*Math.PI/180) + 4;
        add(['flat', rr(10, 18)], 14);
        add(['hill', dy, len, dy > 0 ? 0 : 0.06], len); level += dy;
        add(['limit', dy > 0 ? 8 : 9, 14, 6], 0);           // over the crest / at the bottom: no flying off
        add(['flat', rr(6, 10)], 8);
      } else if (r1 < 0.42){
        add(['log', rr(0.22, 0.34)], 6); add(['flat', rr(4, 9)], 6);
        if (rand() < 0.5){ add(['log', rr(0.22, 0.34)], 6); add(['flat', rr(4, 9)], 6); }
      } else if (r1 < 0.6){
        var up = rand() < 0.65 || level < -g.maxLevel*0.5, sh2 = rr(g.step[0], g.step[1])*(up ? 1 : -1);
        add(['step', sh2, rr(32, 42), 6.5], 5); level += sh2; add(['flat', rr(5, 10)], 8);
      } else if (r1 < 0.8){
        add(['rocks', 5 + Math.floor(rand()*7), rr(g.rock[0], g.rock[1])], 16); add(['flat', rr(6, 10)], 8);
      } else if (r1 < 0.9){
        add(['flat', rr(14, 22)], 18);
        add(['jump', { h:rr(1.0, 1.5), gap:rr(5, 8), deg:24 }], 18);
      } else {
        add(['flat', rr(15, 25)], 20);
      }
    }
    if (level !== 0){ var back = -level, blen = 1.5*Math.abs(back)/Math.tan(12*Math.PI/180) + 6; add(['flat', 12], 12); add(['hill', back, blen, 0], blen); }
    add(['flat', 20], 20);
    return L;
  }
  // motocross: long laps, big gaps, hills with braking bumps on the way down
  add(['flat', rr(40, 55)], 48);
  add(['table', rr(g.h[0], g.h[1]), rr(12, 16)], 40);
  var guard3 = 0, lastHill = false;
  while (dist < g.len && guard3++ < 200){
    var r2 = pick();
    if (r2 < 0.24 && !lastHill && g.hill > 0){
      var dyh = rr(g.hill*0.5, g.hill)*(rand() < 0.5 ? 1 : -1);
      if (Math.abs(level + dyh) > g.hill*1.2) dyh = -dyh;
      var lenh = Math.abs(dyh)/Math.tan(rr(5, 9)*Math.PI/180)*1.3 + 10;
      add(['flat', rr(8, 14)], 11);
      add(['hill', dyh, lenh, dyh < 0 ? 0.045 : 0], lenh); level += dyh; lastHill = true;
      add(['flat', rr(8, 14)], 11);
      continue;
    }
    lastHill = false;
    if (r2 < 0.62){
      var hj = rr(g.h[0], g.h[1]), gp = rr(g.gap[0], g.gap[1]), r3 = rand();
      add(['flat', rr(28, 44)], 36);
      if (r3 < 0.2){ add(['jump', { h:hj, gap:gp*0.75, deg:rr(25, 28), landTop:hj + rr(1, 1.6), landDeg:13, after:rr(0.8, 1.5) }], gp + 30); }      // step-up
      else if (r3 < 0.35){ add(['jump', { h:hj*0.9, gap:gp, deg:rr(23, 26), landTop:hj*0.5, landDeg:10, after:-rr(0.8, 1.4) }], gp + 25); }    // step-down
      else add(['jump', { h:hj, gap:gp, deg:rr(24, 28) }], gp + 30);
    } else if (r2 < 0.8){
      add(['flat', rr(18, 30)], 24);
      add(['table', rr(g.h[0], g.h[1]), rr(14, 22)], 45);
    } else if (r2 < 0.92){
      add(['flat', rr(14, 22)], 18);
      add(['rollers', 6 + Math.floor(rand()*4), rr(4, 5), rr(0.5, 0.7)], 36);
    } else {
      add(['flat', rr(30, 50)], 40);
    }
  }
  if (Math.abs(level) > 0.5){ var bl = Math.abs(level)/Math.tan(6*Math.PI/180)*1.3 + 10; add(['flat', 14], 14); add(['hill', -level, bl, level > 0 ? 0.045 : 0], bl); }
  add(['flat', 26], 26);
  add(['table', g.h[1], 16], 45);                                        // finish-line table
  return L;
}

function generateTrack(def){
  var seed = def.seed;
  function rand(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 10000) / 10000; }
  function rr(a,b){ return a + rand()*(b-a); }
  var runs = [], cur = [{x:-60,y:0},{x:14,y:0}];
  var x = 14, hardStop = def.meters - 60;
  var kinds = [];
  for (var i=0;i<def.jumps;i++) kinds.push('J');
  for (i=0;i<def.tables;i++) kinds.push('T');
  for (i=0;i<def.rollers;i++) kinds.push('R');
  for (i=kinds.length-1;i>1;i--){ var k=1+Math.floor(rand()*i); var t=kinds[i]; kinds[i]=kinds[k]; kinds[k]=t; }
  kinds[0] = 'T';
  var ki = 0, features = [], yb = 0, base = [{x:-60, y:0}, {x:14, y:0}];
  function vLand(A, dx, dy){ var c = Math.cos(A), d = dx*Math.tan(A) - dy; return d > 0.05 ? Math.sqrt(G*dx*dx/(2*c*c*d)) : 99; }
  var layout = def.layout || (def.gen ? genLayout(def, rand, rr) : null);
  if (layout){ kinds = []; layout.forEach(function(st){
    var k = st[0], o = st[1];
    if (k === 'flat'){ x += o; cur.push({x:x, y:yb}); }
    else if (k === 'hill'){
      var dy = st[1], len = st[2], bump = st[3] || 0, y0 = yb;
      if (!bump){ cur.push({x:x+len*0.18, y:y0+dy*0.04}); cur.push({x:x+len*0.82, y:y0+dy*0.96}); cur.push({x:x+len, y:y0+dy}); }
      else { var n = Math.round(len/2.3); for (var q=1;q<=n;q++){ var t = q/n, e = t*t*(3-2*t); var tb = t - 0.5/n, eb = tb*tb*(3-2*tb); cur.push({x:x+len*tb, y:y0+dy*eb + (q<n && t>0.3 ? bump : 0)}); cur.push({x:x+len*t, y:y0+dy*e}); } }
      x += len; yb = y0 + dy; base.push({x:x-len, y:y0}); base.push({x:x, y:yb});
    }
    else if (k === 'limit'){ features.push({ type:'tech', kind:'limit', lipX:x - st[2], end:x + st[3], vmax:st[1] }); }
    else if (k === 'log'){
      // a log lying across the track: round bump (kept round through the smoothing by using several points)
      var lr = st[1]; x += 2; cur.push({x:x, y:yb});
      for (var a2=1;a2<8;a2++){ var an = Math.PI*a2/8; cur.push({x:x + lr*(1 - Math.cos(an))*1.15, y:yb + lr*1.25*Math.sin(an)}); }
      features.push({ type:'tech', kind:'log', lipX:x - 6, end:x + lr*2.3, vmax:st[2] || 6.5, r:lr, x0:x + lr*1.15, y0:yb });
      x += lr*2.3; cur.push({x:x, y:yb}); x += 2; cur.push({x:x, y:yb});
    }
    else if (k === 'step'){
      // rock ledge: steep face up (or down) onto a new level
      var sh2 = st[1], face = Math.abs(sh2)/Math.tan((st[2] || 58)*Math.PI/180), y1 = yb;
      x += 1.5; cur.push({x:x, y:yb}); cur.push({x:x + face*0.15, y:yb + sh2*0.05});
      cur.push({x:x + face*0.85, y:yb + sh2*0.97}); x += face; cur.push({x:x, y:yb + sh2});
      features.push({ type:'tech', kind:'step', lipX:x - face - 8, end:x + 2, vmax:st[3] || 5.5, h:sh2, x0:x - face, y0:y1 });
      base.push({x:x - face, y:yb}); yb += sh2; base.push({x:x, y:yb});
      x += 2.5; cur.push({x:x, y:yb});
    }
    else if (k === 'rocks'){
      // rock garden: irregular boulders sticking out of the ground
      var nr2 = st[1], rmax = st[2], bumps = [], x0r = x;
      for (var q2=0;q2<nr2;q2++){
        var h2 = rr(0.35, 1)*rmax, w2 = Math.max(rr(0.9, 1.8), 3*h2 + 0.3); x += rr(0.4, 1.2); cur.push({x:x, y:yb + rr(-0.03, 0.04)});
        cur.push({x:x + w2*0.18, y:yb + h2*0.35}); cur.push({x:x + w2*0.42, y:yb + h2*0.92}); cur.push({x:x + w2*0.55, y:yb + h2}); cur.push({x:x + w2*0.8, y:yb + h2*0.6});
        bumps.push({x:x + w2*0.5, w:w2, h:h2}); x += w2; cur.push({x:x, y:yb});
      }
      features.push({ type:'tech', kind:'rocks', lipX:x0r - 6, end:x, vmax:st[3] || 3.8, bumps:bumps, y0:yb });
      x += 2; cur.push({x:x, y:yb});
    }
    else if (k === 'rollers'){
      var nr = st[1], sp = st[2], bh = st[3];
      features.push({ type:'rollers', lipX:x, vmin:0, vmax:st[4] || 9, end:x+nr*sp, whoops:!!st[4] });
      for (var j=0;j<nr;j++){ cur.push({x:x+sp*0.5, y:yb+bh}); x += sp; cur.push({x:x, y:yb+0.02}); }
    }
    else if (k === 'table'){
      var th = st[1], top = st[2], lA = 24*Math.PI/180, up = th/Math.tan(lA)*1.5;
      x += 4; cur.push({x:x, y:yb});
      cur.push({x:x+up*0.45, y:yb+th*0.22}); cur.push({x:x+up*0.8, y:yb+th*0.62}); x += up; cur.push({x:x, y:yb+th});
      var tl = x; x += top; cur.push({x:x, y:yb+th});
      var dn = th/Math.tan(10*Math.PI/180); cur.push({x:x+dn*0.5, y:yb+th*0.5}); x += dn; cur.push({x:x, y:yb});
      var Ae = Math.atan(0.38*th/(0.2*up));
      features.push({ type:'table', lipX:tl, vmin:4, vmax:Math.sqrt((top + dn*0.8)*G/Math.sin(2*lA)), big:!!st[3] });
    }
    else if (k === 'jump'){
      var h = o.h, A = (o.deg || 24)*Math.PI/180, L = h/Math.tan(A)*1.55, gap = o.gap, valley = o.valley || 0;
      var landTop = o.landTop != null ? o.landTop : h*0.92, after = o.after || 0, landDeg = (o.landDeg || 10)*Math.PI/180;
      x += 4; cur.push({x:x, y:yb});
      if (o.big){ cur.push({x:x+L*0.3, y:yb+h*0.06}); cur.push({x:x+L*0.62, y:yb+h*0.28}); }   // long straight lip: no kick
      else { cur.push({x:x+L*0.45, y:yb+h*0.22}); cur.push({x:x+L*0.8, y:yb+h*0.62}); }
      x += L; cur.push({x:x, y:yb+h});
      runs.push(cur);
      var lipX = x, Aeff = Math.atan(0.38*h/(0.2*L)), floor = yb + valley;
      cur = [{x:x, y:yb+h}, {x:x + (h - valley)*0.62, y:floor}];
      cur.push({x:x + gap - (landTop - valley)*0.8, y:floor});
      x += gap; cur.push({x:x, y:yb+landTop}); cur.push({x:x+1.2, y:yb+landTop});
      var land = (landTop - after)/Math.tan(landDeg);
      cur.push({x:x+1.2+land*0.5, y:yb+(landTop+after)*0.5});
      x += 1.2 + land; cur.push({x:x, y:yb+after});
      var vmin = vLand(Aeff, gap + 0.8, landTop - h)*1.03, vmax = vLand(Aeff, gap + 1.2 + land*0.8, landTop - (landTop - after)*0.8 - h);
      features.push({ type:'jump', lipX:lipX, vmin:vmin, vmax:Math.max(vmin + 1, vmax), gap:gap, h:h, big:!!o.big, name:o.name });
      if (valley < 0){ base.push({x:lipX, y:yb}); base.push({x:lipX + (h - valley)*0.62 + 2, y:yb+valley}); base.push({x:lipX + gap - (landTop - valley)*0.8 - 2, y:yb+valley}); base.push({x:x, y:yb+after}); }
      else if (after){ base.push({x:lipX, y:yb}); base.push({x:x, y:yb+after}); }
      yb += after;
    }
    else if (k === 'ski'){
      var sh = o.h, sA = 22*Math.PI/180, sL = sh/Math.tan(sA)*1.55, drop = o.drop, sl = o.len;
      cur.push({x:x+sL*0.45, y:yb+sh*0.22}); cur.push({x:x+sL*0.8, y:yb+sh*0.62}); x += sL; cur.push({x:x, y:yb+sh});
      runs.push(cur);
      var slx = x, sAe = Math.atan(0.38*sh/(0.2*sL));
      cur = [{x:x, y:yb+sh}, {x:x+2.5, y:yb+sh-0.5}, {x:x+sl*0.25, y:yb+sh-drop*0.2}, {x:x+sl*0.75, y:yb-drop*0.85}, {x:x+sl, y:yb-drop}];
      base.push({x:x, y:yb}); x += sl; yb -= drop; base.push({x:x, y:yb});
      features.push({ type:'jump', lipX:slx, vmin:6, vmax:Math.max(12, vLand(sAe, sl*0.8, -sh - drop*0.8)), gap:sl*0.3, h:sh, ski:true });
    }
  }); }
  while (!layout && x < hardStop && ki < kinds.length){
    x += rr(24,40); cur.push({x:x,y:0});
    var h = rr(def.h[0], def.h[1]);
    var kind = kinds[ki];
    var lipA = rr(22,27)*Math.PI/180, s2a = Math.sin(2*lipA);
    if (kind === 'J'){
      // concave kicker ending in a sharp lip
      var L = h / Math.tan(lipA) * 1.55;
      cur.push({x:x+L*0.45, y:h*0.22});
      cur.push({x:x+L*0.8, y:h*0.62});
      x += L; cur.push({x:x, y:h});
      runs.push(cur);                              // piece ends exactly at the lip (kept sharp)
      var vmin = rr(12.2, 13.5);
      var gap = 0.9 * vmin*vmin*s2a/G;
      var lipX = x;
      var landTop = h*0.92;
      // real double: steep back side of the kicker, flat ground between, steep face of the landing
      cur = [{x:x, y:h}, {x:x + h*0.62, y:0}];
      cur.push({x:x + gap - landTop*0.8, y:0});
      x += gap; cur.push({x:x, y:landTop});
      cur.push({x:x+1.2, y:landTop});
      var land = landTop / Math.tan(rr(9.5,11)*Math.PI/180);
      cur.push({x:x+1.2+land*0.5, y:landTop*0.5});
      x += 1.2 + land; cur.push({x:x, y:0});
      var reach = gap + 1.2 + land*0.8;
      features.push({ type:'jump', lipX:lipX, vmin:vmin, vmax:Math.sqrt(reach*G/s2a), gap:gap, h:h });
    } else if (kind === 'T'){
      var up = h / Math.tan(lipA) * 1.5;
      cur.push({x:x+up*0.45, y:h*0.22});
      cur.push({x:x+up*0.8, y:h*0.62});
      x += up; cur.push({x:x, y:h});
      var tlipX = x, top = rr(9,14);
      x += top; cur.push({x:x, y:h});
      var down = h / Math.tan(rr(9.5,11)*Math.PI/180);
      cur.push({x:x+down*0.5, y:h*0.5});
      x += down; cur.push({x:x, y:0});
      features.push({ type:'table', lipX:tlipX, vmin:4, vmax:Math.sqrt((top + down*0.8)*G/s2a) });
    } else {
      // rollers (whoops): smooth bumps
      var n = 5 + Math.floor(rand()*3), sp = rr(3.6,4.4), bh = rr(0.45,0.7);
      features.push({ type:'rollers', lipX:x, vmin:0, vmax:9, end:x+n*sp });
      for (var j=0;j<n;j++){ cur.push({x:x+sp*0.5, y:bh}); x += sp; cur.push({x:x, y:0.02}); }
    }
    ki++;
  }
  var end = x + 70;
  cur.push({x:end, y:yb}); cur.push({x:end+80, y:yb}); runs.push(cur); base.push({x:end+80, y:yb});
  function chaikin(p, its){
    for (var it=0; it<its; it++){
      var q=[p[0]];
      for (var j=0;j<p.length-1;j++){
        var a=p[j], b=p[j+1];
        if (j>0) q.push({x:a.x*0.75+b.x*0.25, y:a.y*0.75+b.y*0.25});
        if (j<p.length-2) q.push({x:a.x*0.25+b.x*0.75, y:a.y*0.25+b.y*0.75});
      }
      q.push(p[p.length-1]); p=q;
    }
    var r=[p[0]];
    for (j=1;j<p.length-1;j++){
      var A=r[r.length-1], B=p[j], C=p[j+1];
      if (Math.abs(Math.atan2(B.y-A.y,B.x-A.x) - Math.atan2(C.y-B.y,C.x-B.x)) > 0.003 || B.x-A.x > 6) r.push(B);
    }
    r.push(p[p.length-1]);
    return r;
  }
  // smooth each piece (lips are piece endpoints, so they stay sharp), then join into one continuous ground line
  var joined = [];
  runs.forEach(function(r){ var s = chaikin(r, 4); s.forEach(function(p, j){ if (j === 0 && joined.length) return; joined.push(p); }); });
  var runsM = [joined];
  var segs = [];
  for (var j2=0;j2<joined.length-1;j2++) segs.push({ ax:joined[j2].x, ay:joined[j2].y, bx:joined[j2+1].x, by:joined[j2+1].y });
  var BK = 2, buckets = {};
  segs.forEach(function(s, si){
    var x0 = Math.floor(Math.min(s.ax,s.bx)/BK), x1 = Math.floor(Math.max(s.ax,s.bx)/BK);
    for (var b=x0;b<=x1;b++){ (buckets[b] || (buckets[b]=[])).push(si); }
  });
  // exported (units) for rendering / rival
  var pts=[], solid=[];
  var runsU = runsM.map(function(run){ return run.map(function(p){ return {x:p.x*U, y:p.y*U}; }); });
  runsU.forEach(function(run, ri){
    for (var j=0;j<run.length;j++){
      pts.push(run[j]);
      if (j<run.length-1) solid.push(true); else if (ri<runsU.length-1) solid.push(false);
    }
  });
  var jumpAfter=[], rampUp=[];
  for (i=0;i<pts.length-1;i++){
    var sl=(pts[i+1].y-pts[i].y)/((pts[i+1].x-pts[i].x)||1);
    rampUp.push(solid[i] && sl>0.08);
    jumpAfter.push(solid[i] && solid[i+1]===false);
  }
  return { pts:pts, solid:solid, runs:runsU, runsM:runsM, segs:segs, buckets:buckets, BK:BK,
    jumpAfter:jumpAfter, rampUp:rampUp, features:features, base:base.map(function(b){ return {x:b.x*U, y:b.y*U}; }),
    length:end*U, finishX:(end-12)*U };
}

function trackYAt(track,x){
  var p = track.pts;
  if (x <= p[0].x) return p[0].y;
  var lo=0, hi=p.length-1;
  while (hi-lo>1){ var m=(lo+hi)>>1; if (p[m].x<=x) lo=m; else hi=m; }
  var t=(x-p[lo].x)/((p[hi].x-p[lo].x)||1);
  return p[lo].y+(p[hi].y-p[lo].y)*t;
}
function segAt(track,x){
  var p = track.pts, lo=0, hi=p.length-1;
  if (x < p[0].x) return 0;
  while (hi-lo>1){ var m=(lo+hi)>>1; if (p[m].x<=x) lo=m; else hi=m; }
  return lo;
}
function baseYAt(track, x){
  var b = track.base; if (!b || b.length < 2) return 0;
  if (x <= b[0].x) return b[0].y; if (x >= b[b.length-1].x) return b[b.length-1].y;
  for (var i=0;i<b.length-1;i++){ if (x <= b[i+1].x){ var t = (x - b[i].x)/((b[i+1].x - b[i].x)||1); t = t*t*(3-2*t); return b[i].y + (b[i+1].y - b[i].y)*t; } }
  return 0;
}
function normA(a){ a = a % (2*Math.PI); if (a > Math.PI) a -= 2*Math.PI; if (a < -Math.PI) a += 2*Math.PI; return a; }

/* ---- terrain queries (meters) ---- */
function surfaceInfo(track, x){
  // returns {inRun, y} for the solid run containing x
  var runs = track.runsM;
  for (var i=0;i<runs.length;i++){
    var r = runs[i];
    if (x >= r[0].x && x <= r[r.length-1].x){
      var lo=0, hi=r.length-1;
      while (hi-lo>1){ var m=(lo+hi)>>1; if (r[m].x<=x) lo=m; else hi=m; }
      var t=(x-r[lo].x)/((r[hi].x-r[lo].x)||1);
      return { inRun:true, y:r[lo].y+(r[hi].y-r[lo].y)*t };
    }
  }
  return { inRun:false, y:-1e9 };
}
function contact(track, px, py, rad, out){
  var b0 = Math.floor((px-rad)/track.BK), b1 = Math.floor((px+rad)/track.BK);
  var best = 1e9, cx=0, cy=0, seen = null;
  for (var b=b0;b<=b1;b++){
    var list = track.buckets[b]; if (!list) continue;
    for (var i=0;i<list.length;i++){
      var si = list[i];
      if (b1>b0){ if (!seen) seen = {}; if (seen[si]) continue; seen[si]=1; }
      var s = track.segs[si];
      var dx=s.bx-s.ax, dy=s.by-s.ay, l2=dx*dx+dy*dy||1e-9;
      var t=((px-s.ax)*dx+(py-s.ay)*dy)/l2; t = t<0?0:t>1?1:t;
      var qx=s.ax+dx*t, qy=s.ay+dy*t, d=Math.hypot(px-qx,py-qy);
      if (d<best){ best=d; cx=qx; cy=qy; }
    }
  }
  var si2 = surfaceInfo(track, px);
  var inside = si2.inRun && py < si2.y;
  if (best > 1e8){ out.pen = inside ? rad : -1; out.nx=0; out.ny=1; out.cx=px; out.cy=si2.y; return out; }
  var d = best || 1e-6;
  if (inside){ out.pen = rad + d; out.nx = (cx-px)/d; out.ny = (cy-py)/d; }
  else { out.pen = rad - d; out.nx = (px-cx)/d; out.ny = (py-cy)/d; }
  out.cx = cx; out.cy = cy;
  return out;
}

/* ---------------- the bike ---------------- */
function createSim(track, upgrades, physMode){
  var S = bikeStats(upgrades);
  var arcade = physMode !== 'sim';
  var mb = K.M_BIKE, Ib = K.I_BIKE, mr = K.M_RIDER, R = K.R;
  var wheels = [
    Object.assign({ drive:true,  I:K.I_REAR,  brake:S.brakeR }, K.REAR),
    Object.assign({ drive:false, I:K.I_FRONT, brake:S.brakeF }, K.FRONT)
  ];
  wheels.forEach(function(w){ w.Lmin = w.Lmax - w.travel - S.travel; w.cC *= S.damp; w.cR *= S.damp; });
  var sim = { stats:S, mode: arcade ? 'real' : 'sim',
    x:0, y:0, vx:0, vy:0, th:0, w:0, rx:0, ry:0, rvx:0, rvy:0,
    throttle:0, shift:0, shiftCur:0,
    wheel:[ {om:0, s:0, comp:0, prevComp:0, contact:false, N:0, nx:0, ny:1, Cx:0, Cy:0, slip:0},
            {om:0, s:0, comp:0, prevComp:0, contact:false, N:0, nx:0, ny:1, Cx:0, Cy:0, slip:0} ],
    crashed:false, crashCause:'', finished:false, time:0, airTime:0, grounded:2, flipAccum:0,
    boost:0, flipsTotal:0, events:[], riderPose:0, riderCrouch:0, bodyHit:false, landImpact:0 };
  var tmpC = {};
  function rot(lx, ly){ var c=Math.cos(sim.th), s=Math.sin(sim.th); return [lx*c-ly*s, lx*s+ly*c]; }

  sim.reset = function(){
    var x0 = K.START_X / U;
    sim.x = x0; sim.th = 0; sim.vx = sim.vy = sim.w = 0;
    // place so that the wheels just touch at full extension
    sim.y = R + 0.44 - 0.04 - 0.13;
    var rp = rot(K.RIDER_P0[0], K.RIDER_P0[1]);
    sim.rx = sim.x + rp[0]; sim.ry = sim.y + rp[1]; sim.rvx = sim.rvy = 0;
    sim.throttle = 0; sim.shift = 0; sim.shiftCur = 0;
    sim.wheel.forEach(function(w){ w.om=0; w.comp=0; w.prevComp=0; w.contact=false; w.N=0; });
    sim.crashed=false; sim.crashT=0; sim.riderGround=false; sim.crashCause=''; sim.finished=false; sim.time=0; sim.airTime=0; sim.flipAccum=0; sim.boost=0; sim.flipsTotal=0; sim.events=[];
    sim.grounded = 2;
  };
  // put the bike back on its wheels at x (meters), standing still; race time, flips and events are kept
  sim.respawnAt = function(xm){
    var gy = surfaceInfo(track, xm).y;
    sim.x = xm; sim.th = 0; sim.vx = sim.vy = sim.w = 0;
    sim.y = gy + R + 0.44 - 0.04 - 0.13;
    var rp = rot(K.RIDER_P0[0], K.RIDER_P0[1]);
    sim.rx = sim.x + rp[0]; sim.ry = sim.y + rp[1]; sim.rvx = sim.rvy = 0;
    sim.throttle = 0; sim.shift = 0; sim.shiftCur = 0;
    sim.wheel.forEach(function(w){ w.om=0; w.comp=0; w.prevComp=0; w.contact=false; w.N=0; w.Jacc=0; w.prevBottom=0; });
    sim.crashed=false; sim.crashT=0; sim.riderGround=false; sim.crashCause='';
    sim.airTime=0; sim.flipAccum=0; sim.boost=0; sim.landImpact=0; sim.grounded=2;
  };

  function applyAt(F, fx, fy, px, py){ // accumulate force on bike at world point
    F.fx += fx; F.fy += fy; F.t += (px-sim.x)*fy - (py-sim.y)*fx;
  }

  function substep(inp, dt, go){
    var i, w, W, c;
    // --- controls ---
    var thr = (go && inp.gas && !sim.crashed) ? 1 : 0;
    sim.throttle += (thr - sim.throttle) * Math.min(1, dt/(thr > sim.throttle ? 0.25 : 0.08));
    var brk = (!go) ? 1 : (inp.brake && !sim.crashed ? 1 : 0);
    var lean = sim.crashed ? 0 : ((inp.leanFwd?1:0) - (inp.leanBack?1:0));
    sim.shift = lean;
    var rate = 4.5*dt;
    sim.shiftCur += Math.max(-rate, Math.min(rate, sim.shift - sim.shiftCur));

    var F = { fx:0, fy:-mb*G, t:0 };
    // --- rider: point mass on a stiff spring to its target in the bike frame ---
    var tl = [K.RIDER_P0[0] + K.RIDER_SHIFT*sim.shiftCur, K.RIDER_P0[1] - 0.09*Math.abs(sim.shiftCur) - 0.06*sim.throttle*0];
    var tp = rot(tl[0], tl[1]);
    var tx = sim.x + tp[0], ty = sim.y + tp[1];
    var tvx = sim.vx - sim.w*tp[1], tvy = sim.vy + sim.w*tp[0];
    // after a crash the rider lets go of the bike and tumbles on his own
    var att = sim.crashed ? Math.max(0, 1 - sim.crashT/0.06) : 1;
    var Fx = att*(K.RIDER_K*(tx - sim.rx) + K.RIDER_C*(tvx - sim.rvx));
    var Fy = att*(K.RIDER_K*(ty - sim.ry) + K.RIDER_C*(tvy - sim.rvy));
    applyAt(F, -Fx, -Fy, tx, ty);
    var rfx = Fx, rfy = Fy - mr*G;

    // --- aero drag + (arcade) body english ---
    var sp = Math.hypot(sim.vx, sim.vy);
    var dq = 0.5*K.RHO*K.CDA*sp;
    F.fx -= dq*sim.vx; F.fy -= dq*sim.vy;
    var airborne = !sim.wheel[0].contact && !sim.wheel[1].contact;
    if (arcade && lean !== 0){
      // "throw the body": arcade extra pitch torque from the rider (strong in the air, mild on the ground)
      F.t += -lean * (airborne ? 240 : 100);
    }

    // --- wheels: suspension + ground normal ---
    for (i=0;i<2;i++){
      w = wheels[i]; W = sim.wheel[i];
      var m = rot(w.mount[0], w.mount[1]), a = rot(w.axis[0], w.axis[1]);
      var Mx = sim.x + m[0], My = sim.y + m[1];
      var s = w.Lmax, Cx = Mx + a[0]*s, Cy = My + a[1]*s;
      c = contact(track, Cx, Cy, R, tmpC);
      var bottomPen = 0;
      if (c.pen > 0){
        for (var it=0; it<5 && c.pen > 1e-5; it++){
          var den = -(a[0]*c.nx + a[1]*c.ny); if (den < 0.3) den = 0.3;
          s -= c.pen/den;
          if (s <= w.Lmin){ s = w.Lmin; Cx = Mx + a[0]*s; Cy = My + a[1]*s; c = contact(track, Cx, Cy, R, tmpC); bottomPen = Math.max(0, c.pen); break; }
          Cx = Mx + a[0]*s; Cy = My + a[1]*s;
          c = contact(track, Cx, Cy, R, tmpC);
        }
        W.contact = true;
      } else W.contact = false;
      W.s = s; W.Cx = Cx; W.Cy = Cy;
      W.comp = w.Lmax - s;
      var compRate = (W.comp - W.prevComp)/dt; W.prevComp = W.comp;
      if (W.contact){
        var Fs = w.k*W.comp + (compRate > 0 ? w.cC : w.cR)*compRate;
        if (bottomPen > 0){
          var pr = (bottomPen - (W.prevBottom||0))/dt;
          Fs += K.K_BUMP*bottomPen + K.C_BUMP*Math.max(0, pr);
          if (compRate > 0.8) sim.landImpact = Math.max(sim.landImpact, compRate);
        }
        W.prevBottom = bottomPen;
        if (Fs < 0) Fs = 0;
        W.N = Fs; W.nx = c.nx; W.ny = c.ny;
        applyAt(F, c.nx*Fs, c.ny*Fs, Cx, Cy);
      } else { W.N = 0; W.prevBottom = 0; W.prevComp = 0; }
    }

    // --- chassis / body points against the ground (bash plate, fenders, bars) ---
    sim.bodyHit = false;
    for (i=0;i<K.BODY_PTS.length;i++){
      var bp = K.BODY_PTS[i], q = rot(bp.p[0], bp.p[1]);
      var Px = sim.x + q[0], Py = sim.y + q[1];
      c = contact(track, Px, Py, 0.05, tmpC);
      if (c.pen > 0){
        var vpx = sim.vx - sim.w*q[1], vpy = sim.vy + sim.w*q[0];
        var vn = vpx*c.nx + vpy*c.ny;
        var fn = 120000*c.pen - 2500*Math.min(0, vn);
        if (fn < 0) fn = 0;
        var txv = c.ny, tyv = -c.nx, vt = vpx*txv + vpy*tyv;
        var ff = -Math.max(-0.7*fn, Math.min(0.7*fn, vt*800));
        applyAt(F, c.nx*fn + txv*ff, c.ny*fn + tyv*ff, Px, Py);
        sim.bodyHit = true;
        if (!sim.crashed && go){
          var rel = Math.abs(normA(sim.th - Math.atan2(-c.nx, c.ny)));
          if (bp.fatal || ((bp.n==='rear' || bp.n==='front' || bp.n==='seat') && rel > 1.05)){ sim.crashed = true; sim.crashCause = bp.n; }
        }
      }
    }
    // rider head
    var hp = rot(K.HEAD[0], K.HEAD[1]);
    c = contact(track, sim.rx + hp[0], sim.ry + hp[1], K.HEAD_R, tmpC);
    if (c.pen > 0){
      if (!sim.crashed && go){ sim.crashed = true; sim.crashCause = 'head'; }
      rfx += c.nx*40000*c.pen - 600*sim.rvx*0.2; rfy += c.ny*40000*c.pen - (sim.rvy<0 ? 1200*sim.rvy : 0);
    }

    sim.riderGround = false;
    if (sim.crashed){
      c = contact(track, sim.rx, sim.ry, 0.3, tmpC);
      if (c.pen > 0){
        var rvn = sim.rvx*c.nx + sim.rvy*c.ny;
        var rfn = 30000*c.pen - 1100*Math.min(0, rvn); if (rfn < 0) rfn = 0;
        var rtx = c.ny, rty = -c.nx, rvt = sim.rvx*rtx + sim.rvy*rty;
        var rff = -Math.max(-0.55*rfn, Math.min(0.55*rfn, rvt*500));
        rfx += c.nx*rfn + rtx*rff; rfy += c.ny*rfn + rty*rff;
        sim.riderGround = true;
      }
      sim.crashT += dt;
    }
    // --- integrate velocities ---
    sim.vx += F.fx/mb*dt; sim.vy += F.fy/mb*dt; sim.w += F.t/Ib*dt;
    sim.rvx += rfx/mr*dt; sim.rvy += rfy/mr*dt;
    if (airborne) sim.w *= (1 - 0.15*dt);

    // --- drivetrain: engine / brakes act on wheel spin, reaction acts on the chassis ---
    var boostMul = sim.boost > 0 ? 1.45 : 1;
    for (i=0;i<2;i++){
      w = wheels[i]; W = sim.wheel[i];
      if (w.drive && sim.throttle > 0.001){
        var om = Math.max(W.om, 1);
        var T = Math.min(S.tmax*boostMul, S.power*boostMul/om) * sim.throttle;
        if (W.om > S.wmax*(sim.boost>0?1.12:1)) T = 0;
        var d = T/w.I*dt;
        W.om += d; sim.w += w.I*d/Ib;          // throttle: reaction pitches nose up
      }
      if (brk){
        var bd = w.brake/w.I*dt;
        var take = Math.min(Math.abs(W.om), bd) * (W.om>0?1:-1);
        W.om -= take; sim.w -= w.I*take/Ib;   // braking: reaction pitches nose down
      }
      if (!W.contact){ W.om *= (1 - 0.2*dt); }
    }

    // --- tyre friction impulses (velocity level, clamped by μ·N) ---
    for (var pass=0; pass<2; pass++){
      for (i=0;i<2;i++){
        W = sim.wheel[i]; w = wheels[i];
        if (!W.contact || W.N <= 0) continue;
        var tx2 = W.ny, ty2 = -W.nx;
        var rxw = W.Cx - sim.x, ryw = W.Cy - sim.y;
        var vcx = sim.vx - sim.w*ryw, vcy = sim.vy + sim.w*rxw;
        var slip = vcx*tx2 + vcy*ty2 - W.om*R;
        var rct = rxw*ty2 - ryw*tx2;
        var inv = 1/mb + rct*rct/Ib + R*R/w.I;
        var J = -slip/inv;
        var mu = pass===0 ? S.mu : S.mu;
        var lim = mu*W.N*dt*(pass===0?0.5:0.5);
        var acc = (W.Jacc||0);
        var nj = Math.max(-W.N*dt*S.mu, Math.min(W.N*dt*S.mu, acc + J));
        J = nj - acc; W.Jacc = nj;
        sim.vx += J*tx2/mb; sim.vy += J*ty2/mb; sim.w += rct*J/Ib;
        W.om -= J*R/w.I;
        W.slip = slip;
        // rolling resistance
        if (pass===1) W.om -= Math.sign(W.om)*Math.min(Math.abs(W.om), K.CRR*W.N*R/w.I*dt);
      }
    }
    sim.wheel[0].Jacc = 0; sim.wheel[1].Jacc = 0;

    // --- integrate positions ---
    sim.x += sim.vx*dt; sim.y += sim.vy*dt; sim.th += sim.w*dt;
    sim.rx += sim.rvx*dt; sim.ry += sim.rvy*dt;
  }

  sim.step = function(inp, dt, go){
    if (sim.finished) return;
    var n = Math.max(1, Math.round(dt / K.DT));
    var h = dt / n;
    var wasAir = sim.grounded === 0;
    var th0 = sim.th;
    for (var k=0;k<n;k++) substep(inp, h, go);
    if (go && !sim.crashed) sim.time += dt;
    if (sim.boost > 0) sim.boost -= dt;
    var g2 = (sim.wheel[0].contact?1:0) + (sim.wheel[1].contact?1:0);
    if (g2 === 0){ sim.airTime += dt; sim.flipAccum += sim.th - th0; }
    else {
      if (sim.airTime > 0.35 && !sim.crashed){
        var nF = Math.floor((Math.abs(sim.flipAccum) + 0.9) / (2*Math.PI));
        if (nF >= 1){
          sim.flipsTotal += nF; sim.boost = 1.2 + 0.6*nF;
          sim.events.push({ type: sim.flipAccum>0 ? 'backflip':'frontflip', n:nF });
        } else if (sim.airTime > 1.2) sim.events.push({ type:'air', t:sim.airTime });
      }
      if (sim.airTime > 0.35) sim.events.push({ type:'land', impact:sim.landImpact });
      sim.airTime = 0; sim.flipAccum = 0; sim.landImpact = 0;
    }
    sim.grounded = g2;
    // rider pose for visuals (actual rider offset in bike frame)
    var c = Math.cos(-sim.th), s = Math.sin(-sim.th);
    var dx = sim.rx - sim.x, dy = sim.ry - sim.y;
    var lx = dx*c - dy*s, ly = dx*s + dy*c;
    sim.riderPose = Math.max(-1.3, Math.min(1.3, (lx - K.RIDER_P0[0]) / K.RIDER_SHIFT));
    sim.riderCrouch = Math.max(0, Math.min(1.5, (K.RIDER_P0[1] - ly) / 0.12));
    if (sim.y < trackYAt(track, sim.x*U)/U - 15) { if (!sim.crashed){ sim.crashed = true; sim.crashCause = 'pit'; } }
    var si = surfaceInfo(track, sim.x);
    if (false){ sim.crashed = true; sim.crashCause = 'pit'; }
    if (sim.x*U > track.finishX && !sim.crashed) sim.finished = true;
  };
  // helpers in render units
  sim.angle = function(){ return normA(sim.th); };
  sim.visPos = function(){ var o = rot(0, K.VIS_OFF); return { x:(sim.x+o[0])*U, y:(sim.y+o[1])*U }; };
  sim.wheelPos = function(i){ return { x:sim.wheel[i].Cx*U, y:sim.wheel[i].Cy*U }; };
  sim.speedX = function(){ return sim.vx*U; };
  sim.kmh = function(){ return Math.hypot(sim.vx, sim.vy)*3.6; };
  sim.reset();
  return sim;
}

/* ---------------- rival: kinematic racer following the track with ballistic jumps ---------------- */
function createRival(track, def){
  var r = { x:K.START_X, y:trackYAt(track,K.START_X), vx:0, vy:0, air:false, angle:0, time:0, finished:false, finishTime:0, pitHit:false };
  var top = def.rivalSpeed*U, acc = 5.5*U, g = G*U;
  r.reset = function(){ r.x=K.START_X; r.y=trackYAt(track,r.x); r.vx=0; r.vy=0; r.air=false; r.angle=0; r.time=0; r.finished=false; };
  r.step = function(dt, go){
    if (!go) return;
    r.time += dt;
    var p = track.pts;
    if (!r.air){
      var i = segAt(track, r.x);
      var slope = (p[i+1].y-p[i].y)/((p[i+1].x-p[i].x)||1);
      var target = top * (0.97 + 0.03*Math.sin(r.time*0.7));
      var xm = r.x/U;
      for (var fi=0; fi<track.features.length; fi++){
        var fe = track.features[fi], endX = fe.end != null ? fe.end : fe.lipX;
        if (endX < xm - 1) continue;
        if (fe.lipX - xm < (fe.type==='jump' ? 70 : 45)){
          var ft = fe.type==='jump' ? fe.vmin*0.4 + fe.vmax*0.6 : fe.type==='table' ? fe.vmax*0.85 : (fe.vmax || 8.5)*(def.techPace || 1);
          // a slow rival still carries enough speed to clear the gaps; its pace only shows on the flats
          target = fe.type==='jump' ? ft*U : Math.min(target, ft*U);
        }
        break;
      }
      var a = (target > r.vx ? acc*(1 - r.vx/(Math.max(top, target)*1.15)) : -acc*1.5) - g*Math.sin(Math.atan(slope))*0.35;
      r.vx += a*dt; if (r.vx < 0) r.vx = 0;
      var nx = r.x + r.vx*Math.cos(Math.atan(slope))*dt;
      var lip = null;
      for (var li=0; li<track.features.length; li++){ var ff = track.features[li]; if (ff.type === 'jump' && r.x < ff.lipX*U && nx >= ff.lipX*U){ lip = ff; break; } }
      if (lip){
        var ls = segAt(track, lip.lipX*U - 2), lsl = (p[ls+1].y-p[ls].y)/((p[ls+1].x-p[ls].x)||1);
        r.air = true; r.vy = r.vx*Math.sin(Math.atan(lsl)); r.vx = r.vx*Math.cos(Math.atan(lsl)); r.x = nx;
      } else {
        r.x = nx; r.y = trackYAt(track, r.x);
        r.angle += (Math.atan(slope) - r.angle)*Math.min(1, dt*10);
      }
    } else {
      r.vy -= g*dt; r.x += r.vx*dt; r.y += r.vy*dt;
      var gy = trackYAt(track, r.x);
      r.angle += (Math.atan2(r.vy, r.vx)*0.5 - r.angle)*Math.min(1, dt*2.5);
      if (r.y <= gy && r.vy < 0){
        var si = segAt(track, r.x); if (!track.solid[si]) r.pitHit = true;
        r.y = gy; r.air=false; r.vx = Math.hypot(r.vx, r.vy*0.3);
      }
    }
    if (!r.finished && r.x > track.finishX){ r.finished = true; r.finishTime = r.time; }
  };
  return r;
}

return { K:K, U:U, TRACKS:TRACKS, UPGRADES:UPGRADES, bikeStats:bikeStats, generateTrack:generateTrack, trackYAt:trackYAt, baseYAt:baseYAt, segAt:segAt, normA:normA, createSim:createSim, createRival:createRival, contact:contact, surfaceInfo:surfaceInfo };
}
/*CORE_END*/
if (typeof module !== 'undefined') module.exports = makeCore;
