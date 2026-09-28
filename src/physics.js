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
  { id:0, name:"Poeira Vermelha", seed:918273, meters:520, jumps:5, tables:3, rollers:0, h:[1.4,2.2], theme:0, rivalSpeed:13.4, rivalName:"Zeca", gold:40 },
  { id:1, name:"Vale do Eco",     seed:55123,  meters:600, jumps:6, tables:3, rollers:1, h:[1.6,2.5], theme:1, rivalSpeed:15.1, rivalName:"Bia Turbo", gold:47 },
  { id:2, name:"Serra Negra",     seed:777001, meters:680, jumps:7, tables:3, rollers:1, h:[1.8,2.8], theme:2, rivalSpeed:16.75, rivalName:"Lobo", gold:51.5 },
  { id:3, name:"Noite de Lua",    seed:31337,  meters:760, jumps:8, tables:3, rollers:2, h:[2.0,3.0], theme:3, rivalSpeed:20.5, rivalName:"Sombra", gold:57.5 },
  { id:4, name:"Cânion Final",    seed:240901, meters:840, jumps:9, tables:3, rollers:2, h:[2.2,3.3], theme:4, rivalSpeed:23.1, rivalName:"Rei do Barro", gold:64 }
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
  var ki = 0, features = [];
  while (x < hardStop && ki < kinds.length){
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
  cur.push({x:end, y:0}); cur.push({x:end+80, y:0}); runs.push(cur);
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
    jumpAfter:jumpAfter, rampUp:rampUp, features:features,
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
    if (sim.y < -15) { if (!sim.crashed){ sim.crashed = true; sim.crashCause = 'pit'; } }
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
        var fe = track.features[fi], endX = fe.type==='rollers' ? fe.end : fe.lipX;
        if (endX < xm - 1) continue;
        if (fe.lipX - xm < 45){
          var ft = fe.type==='jump' ? fe.vmin*0.4 + fe.vmax*0.6 : fe.type==='table' ? fe.vmax*0.85 : 8.5;
          target = Math.min(target, ft*U);
        }
        break;
      }
      var a = (target > r.vx ? acc*(1 - r.vx/(top*1.15)) : -acc*1.5) - g*Math.sin(Math.atan(slope))*0.35;
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

return { K:K, U:U, TRACKS:TRACKS, UPGRADES:UPGRADES, bikeStats:bikeStats, generateTrack:generateTrack, trackYAt:trackYAt, segAt:segAt, normA:normA, createSim:createSim, createRival:createRival, contact:contact, surfaceInfo:surfaceInfo };
}
/*CORE_END*/
if (typeof module !== 'undefined') module.exports = makeCore;
