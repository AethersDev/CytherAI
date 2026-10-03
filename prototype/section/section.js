/* THE SECTION — an architectural study, not a simulation of product execution.
   Four original procedural sculptures. Canvas projection, no libraries or requests.
   Product descriptions link to their own evidence; the sculpture carries no metrics. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = $('.hero'), openButton = $('#open-section'), motionButton = $('#motion');
  let expanded = false, paused = media.matches, selected = 0, spread = 0, turn = -.48, turnTarget = -.48;
  let activePart = -1, time = 0, last = 0, raf = 0;
  const faces = [[], [], [], []];
  const bases = [1.08, .16, -.74, -1.66];
  const names = ['FORM / 01', 'JUDGMENT / 02', 'EXECUTION / 03', 'MEMORY / 04'];
  const norm = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
  function face(part, pts, kind = 'body') {
    const a = pts[1].map((v, i) => v - pts[0][i]);
    const b = pts[2].map((v, i) => v - pts[0][i]);
    const normal = norm([a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]);
    faces[part].push({pts, normal, kind, part});
  }
  function box(part, x, y, z, w, h, d, kind='body') {
    const p = [[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]];
    [[4,7,6,5],[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]].forEach(f => face(part,f.map(i=>p[i]),kind));
  }
  function contour(a,b,c=.12) { return [[-a+c,-b],[a-c,-b],[a,-b+c],[a,b-c],[a-c,b],[-a+c,b],[-a,b-c],[-a,-b+c]]; }
  function ring(part, y, h, a, b, ia, ib, kind='body', offset=0) {
    const outer=contour(a,b),inner=contour(ia,ib,Math.min(.1,ia*.3));
    const p=(v,dy)=>[v[0]+offset,y+dy,v[1]];
    for(let i=0;i<8;i++) {
      const j=(i+1)%8;
      face(part,[p(outer[i],h),p(inner[i],h),p(inner[j],h),p(outer[j],h)],kind);
      face(part,[p(outer[i],0),p(outer[i],h),p(outer[j],h),p(outer[j],0)],kind);
      face(part,[p(inner[j],0),p(inner[j],h),p(inner[i],h),p(inner[i],0)],'inner');
      face(part,[p(outer[j],0),p(inner[j],0),p(inner[i],0),p(outer[i],0)],kind);
    }
  }
  // 01: nested construction contours, gathered into a single machined profile.
  for(let i=0;i<7;i++) ring(0,i*.087,.06,1.25-i*.024,1.03-i*.014,.63+i*.027,.4+i*.023);
  ring(0,-.055,.027,1.26,1.04,.62,.39,'interface');
  for(let i=0;i<8;i++)box(0,-1.04+i*.085,.59,.855,.031,.013,.08,'detail');
  // 02: a field with an interruption. A separate piece makes the gap visible.
  for(let x=0;x<7;x++)for(let z=0;z<6;z++) {
    if((x===4||x===5)&&(z===0||z===1))continue;
    const h=.48+((x+z)%3)*.035;
    box(1,-1.25+x*.358,0,-1.03+z*.344,.338,h,.324);
  }
  box(1,.18,.64,-1.19,.67,.16,.65,'piece');
  // 03: parallel execution channels, held between two structural plates.
  ring(2,0,.09,1.25,1.03,.55,.48);
  for(let i=0;i<14;i++) {
    const x=-1.2+i*.178;
    box(2,x,.09,-1.01,.083,.44,2.02);
  }
  box(2,-1.25,.55,-1.03,2.5,.065,.21);
  box(2,-1.25,.55,.82,2.5,.065,.21);
  // 04: physically separate leaves, each retaining its place in the sequence.
  for(let i=0;i<15;i++)ring(3,i*.042,.024,1.25,1.03,.59,.42,'body',i%5===0?.025:0);
  box(3,-1.27,-.09,-1.05,2.54,.06,2.1);

  class Sculpture {
    constructor(canvas, specimen=false) {
      this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.specimen=specimen; this.visible=true;this.w=0;this.h=0;
      new ResizeObserver(()=>{this.resize();wake();}).observe(canvas);
      new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)wake();},{rootMargin:'100px'}).observe(canvas);
      this.resize();
    }
    resize() {
      const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;
      const d=Math.min(devicePixelRatio||1,2);
      this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);
      if(this.ctx)this.ctx.setTransform(d,0,0,d,0,0);
    }
    draw() {
      if(!this.ctx||!this.w||!this.h)return;
      const ctx=this.ctx,w=this.w,h=this.h,dark=this.specimen;
      ctx.clearRect(0,0,w,h);
      const angle=turn+(dark?.22:0)+(paused?0:Math.sin(time*.16)*.07);
      const c=Math.cos(angle),s=Math.sin(angle),tilt=dark?.48:.38,ct=Math.cos(tilt),st=Math.sin(tilt);
      const scale=dark?Math.min(w/3.9,h/3.1):Math.min(w/4.55,h/(5.35+spread*1.3));
      const cx=w*(dark?.5:.49),cy=h*(dark?.56:.52);
      const project=p=>{
        const x=p[0]*c+p[2]*s,z=-p[0]*s+p[2]*c;
        return [cx+x*scale,cy+(-p[1]*ct+z*st)*scale,z*ct+p[1]*st];
      };
      // A soft contact shadow places the drawing in the page, without a scene backdrop.
      ctx.save();ctx.translate(cx,cy+scale*(dark?.48:1.75+spread*.18));ctx.scale(1,.24);
      const shadow=ctx.createRadialGradient(0,0,scale*.12,0,0,scale*1.85);
      shadow.addColorStop(0,dark?'rgba(0,0,0,.6)':'rgba(27,36,23,.21)');shadow.addColorStop(.48,dark?'rgba(0,0,0,.25)':'rgba(27,36,23,.09)');shadow.addColorStop(1,'rgba(20,30,20,0)');
      ctx.fillStyle=shadow;ctx.fillRect(-scale*2,-scale*2,scale*4,scale*4);ctx.restore();
      // The datum is an editorial construction line, never a measured value.
      if(!dark){
        ctx.strokeStyle='rgba(42,54,37,.14)';ctx.lineWidth=.6;ctx.setLineDash([2,5]);
        ctx.beginPath();ctx.moveTo(cx,42);ctx.lineTo(cx,h-30);ctx.stroke();ctx.setLineDash([]);
        for(const y of [cy-scale*1.8,cy+scale*1.8]){ctx.beginPath();ctx.moveTo(cx-7,y);ctx.lineTo(cx+7,y);ctx.moveTo(cx,y-7);ctx.lineTo(cx,y+7);ctx.stroke();}
      }
      const polys=[];
      const parts=dark?[selected]:[0,1,2,3];
      for(const part of parts) {
        const base=dark?-.29:bases[part]+spread*(1.5-part)*.58;
        const dx=dark?0:spread*(part===1?.17:part===2?-.17:0);
        for(const f of faces[part]) {
          const pts=f.pts.map(p=>project([p[0]+dx,p[1]+base,p[2]]));
          const n=f.normal;
          const rn=[n[0]*c+n[2]*s,n[1],-n[0]*s+n[2]*c];
          const facing=rn[2]*ct+rn[1]*st;
          if(facing<-.01)continue;
          polys.push({pts,f,rn,depth:pts.reduce((n,p)=>n+p[2],0)/pts.length});
        }
      }
      polys.sort((a,b)=>a.depth-b.depth);
      for(const p of polys){
        const {f,rn,pts}=p;
        const light=Math.max(0,rn[0]*-.4+rn[1]*.83+rn[2]*.4);
        const top=Math.max(0,rn[1]);
        let rgb;
        const highlight=f.kind==='interface'||(activePart===f.part&&!dark&&expanded)||(f.kind==='piece'&&(dark||expanded));
        if(highlight)rgb=[23+light*25,41+light*34,156+light*85];
        else if(dark)rgb=[85+light*130,94+light*130,82+light*128];
        else rgb=[35+light*94+top*24,43+light*94+top*24,34+light*92+top*24];
        if(f.kind==='inner')rgb=rgb.map(v=>v*.65);
        if(f.kind==='detail')rgb=dark?[40,49,36]:[195,202,187];
        ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();
        ctx.fillStyle=`rgb(${rgb.map(Math.round).join(',')})`;ctx.fill();
        ctx.lineWidth=dark?.55:.5;ctx.strokeStyle=dark?'rgba(222,235,205,.14)':'rgba(219,229,204,.22)';ctx.stroke();
      }
      // The active cut is a navigational state. It does not encode a product verdict.
      if(!dark&&spread>.1){
        ctx.save();ctx.globalAlpha=spread*.65;ctx.strokeStyle='#737d6b';ctx.lineWidth=.7;ctx.setLineDash([2,4]);
        for(let part=0;part<4;part++){
          const p=project([1.25,bases[part]+spread*(1.5-part)*.58+.3,0]);
          ctx.beginPath();ctx.moveTo(p[0]+8,p[1]);ctx.lineTo(Math.min(w*.88,p[0]+60),p[1]);ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  const assembly=new Sculpture($('#assembly'));
  const specimen=new Sculpture($('#specimen'),true);
  function render(ms){
    raf=0;
    if(document.hidden){last=0;return;}
    const dt=last?Math.min((ms-last)/1000,.05):.016;last=ms;
    const animate=!paused&&!media.matches;
    if(animate)time+=dt;
    const goal=expanded?1:0;
    if(media.matches){spread=goal;turn=turnTarget;}
    else{spread+=(goal-spread)*Math.min(1,dt*6);turn+=(turnTarget-turn)*Math.min(1,dt*9);}
    const changing=Math.abs(spread-goal)>.001||Math.abs(turn-turnTarget)>.001;
    if(assembly.visible)assembly.draw();if(specimen.visible)specimen.draw();
    if(changing||(animate&&(assembly.visible||specimen.visible)))raf=requestAnimationFrame(render);
  }
  function wake(){if(!raf)raf=requestAnimationFrame(render);}
  function setOpen(value){
    expanded=value;hero.classList.toggle('is-open',expanded);openButton.setAttribute('aria-expanded',String(expanded));$('#assembly-parts').inert=!expanded;
    openButton.innerHTML=expanded?'Close the section <span aria-hidden="true">−</span>':'Open the section <span aria-hidden="true">+</span>';
    $('#view-label').textContent=expanded?'02 — Separated':'01 — Assembled';wake();
  }
  openButton.addEventListener('click',()=>setOpen(!expanded));
  function motionState(){motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Resume sculpture motion':'Pause sculpture motion');motionButton.textContent=paused?'▷':'Ⅱ';wake();}
  motionButton.addEventListener('click',()=>{paused=!paused;motionState();});
  media.addEventListener('change',()=>{paused=media.matches;motionState();});
  motionState();
  const tabs=$$('[role=tab]'), panels=$$('[role=tabpanel]');
  function select(n,focus=false){
    selected=n;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===n));tab.tabIndex=i===n?0:-1;});
    panels.forEach((panel,i)=>panel.hidden=i!==n);
    $('#specimen-name').textContent=names[n];if(focus)tabs[n].focus();wake();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>select(i));
    tab.addEventListener('keydown',e=>{
      let n=i;if(e.key==='ArrowRight')n=(i+1)%4;else if(e.key==='ArrowLeft')n=(i+3)%4;else if(e.key==='Home')n=0;else if(e.key==='End')n=3;else return;
      e.preventDefault();select(n,true);
    });
  });
  $$('[data-part]').forEach(button=>{
    button.addEventListener('pointerenter',()=>{activePart=Number(button.dataset.part);wake();});
    button.addEventListener('pointerleave',()=>{activePart=-1;wake();});
    button.addEventListener('focus',()=>{activePart=Number(button.dataset.part);wake();});
    button.addEventListener('blur',()=>{activePart=-1;wake();});
    button.addEventListener('click',()=>{select(Number(button.dataset.part));$('#systems').scrollIntoView({behavior:media.matches?'instant':'smooth'});tabs[selected].focus({preventScroll:true});});
  });
  let drag=null;
  $('#assembly').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;drag={x:e.clientX,angle:turnTarget};e.currentTarget.setPointerCapture(e.pointerId);});
  $('#assembly').addEventListener('pointermove',e=>{if(!drag)return;turnTarget=Math.max(-1.4,Math.min(.8,drag.angle+(e.clientX-drag.x)*.004));wake();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#assembly').addEventListener(event,()=>drag=null);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
  document.fonts.ready.then(wake);
  wake();
})();
