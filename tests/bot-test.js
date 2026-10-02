const core=require('../src/physics.js')();
const mode=process.argv[2]||'real', lvl=+(process.argv[3]||0), only=process.env.T, trace=process.env.TR;
function slopeAt(tr,xm,w){ const U=core.U; w=w||0.6; return Math.atan((core.trackYAt(tr,(xm+w)*U)-core.trackYAt(tr,(xm-w)*U))/(2*w*U)); }
function run(def){
  const tr=core.generateTrack(def), sim=core.createSim(tr,{engine:lvl,suspension:lvl,tires:lvl},mode), rv=core.createRival(tr,def);
  for(let f=0;f<120;f++) sim.step({},1/60,false);
  let log=[];
  for(let f=0;f<60*320;f++){
    const x=sim.x, v=sim.vx;
    const feat=tr.features.find(fe => (fe.end != null ? fe.end : fe.lipX) > x-1);
    let vt=26;
    if (feat){ const dist=feat.lipX-x;
      if (dist<60){ vt = feat.type==='jump' ? (feat.vmin*(1-(+process.env.VW||0.55))+feat.vmax*(+process.env.VW||0.55)) : feat.type==='table' ? feat.vmax*0.8 : (feat.vmax||8.5); }
      if (feat.end != null && x>feat.lipX-5) vt=feat.vmax||8.5;
      if (dist>0) vt=Math.min(26, Math.sqrt(vt*vt + 2*4.5*Math.max(0, dist-8))); }
    const inp={};
    const air = sim.grounded===0;
    const inTech = tr.features.some(fe => fe.type==='tech' && x > fe.lipX && x < fe.end + 2);
    const sl = slopeAt(tr, air ? x + v*0.45 : x, inTech ? 1.6 : 0.6);
    const rel = core.normA(sim.th - sl);
    if (!air){
      inp.gas = v < vt; inp.brake = v > vt+1.2 && rel > -0.3;
      if (rel > 0.18) inp.leanFwd=true; if (rel > 0.35 || (sim.grounded===1 && rel > 0.15)) inp.gas=false; if (rel < -0.18) inp.leanBack=true;
    } else {
      const u = -(2.2*rel + 0.7*sim.w);
      if (process.env.FLIP && sim.flipAccum < 2*Math.PI - (+process.env.FLIP)){ inp.leanBack = true; inp.gas = true; }
      else
      if (u > 0.25) inp.leanBack=true; else if (u < -0.25) inp.leanFwd=true;
      if (mode==='sim'){ if (u > 0.35) inp.gas=true; if (u < -0.35) inp.brake=true; }
    }
    sim.step(inp,1/60,true); rv.step(1/60,true);
    if (trace && def.id==+trace && f%10==0) log.push([ (f/60).toFixed(2), x.toFixed(1), sim.y.toFixed(2), (v*3.6).toFixed(0), vt.toFixed(1), sim.th.toFixed(2), rel.toFixed(2), sim.grounded, (inp.gas?'G':'')+(inp.brake?'B':'')+(inp.leanFwd?'F':'')+(inp.leanBack?'K':'') ].join(' '));
    if (sim.crashed||sim.finished) break;
  }
  while(!rv.finished && rv.time<200) rv.step(1/60,true);
  if (trace && def.id==+trace) console.log(log.slice(-60).join('\n'));
  return {fin:sim.finished, crash:sim.crashed?sim.crashCause:'', x:sim.x.toFixed(0)+'/'+(tr.finishX/core.U).toFixed(0), t:sim.time.toFixed(1), rival:rv.finishTime.toFixed(1), rivalPit:rv.pitHit, flips:sim.flipsTotal};
}
for (const d of core.TRACKS){ if (only && !only.split(',').includes(String(d.id))) continue; console.log(String(d.id).padStart(2), (d.mode||'').padEnd(3), d.name.padEnd(18), JSON.stringify(run(d))); }
