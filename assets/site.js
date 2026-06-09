/* ============================================================
   Vincent Calip — shared behaviors
   Every block is guarded so a page only runs what it contains.
   Loaded after GSAP (+ ScrollTrigger / D3 where present).
   ============================================================ */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = window.matchMedia('(pointer: fine)').matches;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---- navigate via JS so the browser status bar doesn't preview URLs on hover ---- */
  document.querySelectorAll('a[href]').forEach(a=>{
    a.dataset.href = a.getAttribute('href');
    if (a.target) a.dataset.target = a.target;
    a.removeAttribute('href'); a.removeAttribute('target');
    a.setAttribute('role','link');
    if (!a.hasAttribute('tabindex')) a.setAttribute('tabindex','0');
  });
  function navigate(a,e){
    const url=a.dataset.href; if(!url) return;
    if (a.dataset.target==='_blank' || (e && (e.metaKey||e.ctrlKey))) window.open(url,'_blank','noopener');
    else window.location.href=url;
  }
  document.addEventListener('click', e=>{ const a=e.target.closest('[data-href]'); if(a) navigate(a,e); });
  document.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const a=e.target.closest&&e.target.closest('[data-href]'); if(a){ e.preventDefault(); navigate(a,e);} } });

  /* ---- custom cursor: dot tracks pointer 1:1 ---- */
  if (fine){
    const dot = document.querySelector('.cursor-dot');
    if (dot) addEventListener('mousemove', e=>{
      dot.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
    });
  }

  /* ---- letter-level ripple: an expanding wavefront rolls across the text ---- */
  const RIPPLE_SEL = '[data-hero-line], .eyebrow, .hero-sub, .page-title, .page-intro, .sec-title, .lead, .project h3, .talk .ttl, .tl-venue, .card h3, .page-cta .big';
  let letters = [], centers = [], prevY = null, waves = [], raf = null;

  function splitLetters(root){
    const walk = node=>{
      [...node.childNodes].forEach(n=>{
        if(n.nodeType===3){                                  // text node → words(.rw) made of letters(.rl)
          const frag=document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part=>{
            if(part==='') return;
            if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }   // keep spaces breakable
            const w=document.createElement('span'); w.className='rw';
            for(const ch of part){ const s=document.createElement('span'); s.className='rl'; s.textContent=ch; w.appendChild(s); }
            frag.appendChild(w);
          });
          node.replaceChild(frag,n);
        } else if(n.nodeType===1 && n.tagName!=='BR'){ walk(n); }   // recurse into <em> etc.
      });
    };
    walk(root);
  }

  if(!reduce){
    document.querySelectorAll(RIPPLE_SEL).forEach(splitLetters);
    letters = [...document.querySelectorAll('.rl')];
    prevY = new Float32Array(letters.length);
  }

  function measure(){
    centers = letters.map(s=>{ const r=s.getBoundingClientRect();
      return {x:r.left+scrollX+r.width/2, y:r.top+scrollY+r.height/2}; });
  }

  const SPEED=820, WIDTH=135, AMP=11, TLIFE=1.05, DREACH=1500;   // px/s, crest width, lift, decay, reach
  function tick(now){
    for(let i=0;i<letters.length;i++){
      const c=centers[i]; let dy=0;
      for(const wv of waves){
        const t=(now-wv.t0)/1000, R=SPEED*t;
        const d=Math.hypot(c.x-wv.x, c.y-wv.y);
        const u=(R-d)/WIDTH;                                 // 0 when the wavefront is exactly at this letter
        if(u>-3.2 && u<3.2){
          const env=Math.exp(-t/TLIFE)*Math.max(0,1-d/DREACH);
          dy += -AMP*Math.exp(-u*u)*env;                     // smooth single-lobe crest
        }
      }
      if(Math.abs(dy-prevY[i])>0.04){
        letters[i].style.transform = dy ? `translateY(${dy.toFixed(2)}px)` : '';
        prevY[i]=dy;
      }
    }
    waves = waves.filter(wv=> (now-wv.t0)/1000 < TLIFE*2.2 );
    if(waves.length) raf=requestAnimationFrame(tick);
    else { raf=null; for(let i=0;i<letters.length;i++){ if(prevY[i]){letters[i].style.transform='';prevY[i]=0;} } }
  }
  function spawn(cx,cy){
    if(reduce || !letters.length) return;
    if(!waves.length) measure();                             // refresh positions only when at rest
    waves.push({x:cx+scrollX, y:cy+scrollY, t0:performance.now()});
    if(!raf) raf=requestAnimationFrame(tick);
  }

  /* ---- soft click glow + ripple trigger ---- */
  if(!reduce){
    addEventListener('pointerdown', e=>{
      const p=document.createElement('div'); p.className='click-pulse';
      p.style.left=e.clientX+'px'; p.style.top=e.clientY+'px';
      document.body.appendChild(p);
      p.animate(
        [{transform:'translate(-50%,-50%) scale(.25)',opacity:.8},
         {transform:'translate(-50%,-50%) scale(2.4)',opacity:0}],
        {duration:900, easing:'cubic-bezier(.22,1,.36,1)'}
      ).onfinish=()=>p.remove();
      spawn(e.clientX, e.clientY);
    });
  }

  /* ---- magnetic buttons ---- */
  if (fine && window.gsap){
    document.querySelectorAll('[data-magnetic]').forEach(el=>{
      el.addEventListener('mousemove', e=>{
        const r = el.getBoundingClientRect();
        gsap.to(el,{x:(e.clientX-(r.left+r.width/2))*.35, y:(e.clientY-(r.top+r.height/2))*.45, duration:.5, ease:'power3.out'});
      });
      el.addEventListener('mouseleave', ()=>gsap.to(el,{x:0,y:0,duration:.6,ease:'elastic.out(1,.4)'}));
    });
  }

  /* ---- landing hero: letter cascade ---- */
  if (window.gsap){
    const heroLetters = document.querySelectorAll('[data-hero-line] .rl');
    if (!reduce && heroLetters.length){
      gsap.set('[data-hero]',{opacity:0,y:22});
      gsap.timeline({defaults:{ease:'expo.out'}})
        .from(heroLetters,{yPercent:120,opacity:0,duration:.9,stagger:.02},0)
        .to('[data-hero]',{opacity:1,y:0,duration:.9,stagger:.12},'-=.5');
    } else {
      gsap.set('[data-hero]',{opacity:1,y:0});
    }
  }

  /* ---- scroll reveals ---- */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length){
    if (window.gsap && window.ScrollTrigger && !reduce){
      reveals.forEach(el=>{
        gsap.to(el,{opacity:1,y:0,duration:1,ease:'expo.out',
          scrollTrigger:{trigger:el,start:'top 88%'}});
      });
    } else if (window.gsap){
      gsap.set(reveals,{opacity:1,y:0});
    }
  }

  /* ---- count-up stats ---- */
  if (window.gsap && window.ScrollTrigger){
    document.querySelectorAll('[data-count]').forEach(el=>{
      const target = +el.dataset.count;
      ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:()=>{
        const o={v:0};
        gsap.to(o,{v:target,duration:1.6,ease:'power2.out',onUpdate:()=>{el.textContent=Math.round(o.v);}});
      }});
    });
  }

  /* ---- speaking timeline: jump rail (only if .tl-rail present) ---- */
  (function jumpRail(){
    const rail = document.querySelector('.tl-rail');
    if(!rail) return;
    const stops = [...rail.querySelectorAll('.tl-stop[data-target]')];
    if(!stops.length) return;

    function goTo(id){
      const el = document.getElementById(id);
      if(!el) return;
      el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
      el.classList.remove('tl-flash'); void el.offsetWidth;   // restart the flash
      el.classList.add('tl-flash');
      el.addEventListener('animationend', ()=>el.classList.remove('tl-flash'), {once:true});
    }
    stops.forEach(s=> s.addEventListener('click', ()=>goTo(s.dataset.target)) );

    /* keep the active stop in sync with what's on screen */
    if('IntersectionObserver' in window){
      const byId = Object.fromEntries(stops.map(s=>[s.dataset.target, s]));
      const io = new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          if(en.isIntersecting){
            stops.forEach(s=>s.classList.remove('is-active'));
            const s = byId[en.target.id]; if(s) s.classList.add('is-active');
          }
        });
      }, {rootMargin:'-45% 0px -45% 0px', threshold:0});
      document.querySelectorAll('.tl-item[id]').forEach(it=>io.observe(it));
    }
  })();

  /* ---- 3D tilt cards ---- */
  if (fine && window.gsap){
    document.querySelectorAll('[data-tilt]').forEach(card=>{
      card.addEventListener('mousemove', e=>{
        const r = card.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
        gsap.to(card,{rotateY:px*12,rotateX:-py*12,duration:.4,ease:'power2.out',transformPerspective:800});
      });
      card.addEventListener('mouseleave', ()=>gsap.to(card,{rotateY:0,rotateX:0,duration:.7,ease:'elastic.out(1,.5)'}));
    });
  }

  /* ---- neural field background ---- */
  (function neuralField(){
    const c = document.getElementById('orbit'); if(!c) return;
    const ctx = c.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio||1,1.5);
    let w,h,nodes=[],nraf=null;
    let tmx=-9999,tmy=-9999,mx=-9999,my=-9999;
    const WELL=180*DPR, SINK=0.95;

    function size(){
      w=c.width=Math.floor(innerWidth*DPR); h=c.height=Math.floor(innerHeight*DPR);
      c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px';
    }
    function buildNodes(){
      nodes=[];
      const count=reduce?24:Math.min(95,Math.round((innerWidth*innerHeight)/17000));
      for(let i=0;i<count;i++){
        const x=Math.random()*w,y=Math.random()*h;
        nodes.push({hx:x,hy:y,x,y,vx:0,vy:0,depth:0,energy:0,_g:0,
          r:(Math.random()*1.3+1)*DPR,drift:Math.random()*6.28,ds:Math.random()*.4+.2});
      }
    }
    size(); buildNodes();
    addEventListener('resize',()=>{size();buildNodes();});
    addEventListener('mousemove',e=>{tmx=e.clientX*DPR;tmy=e.clientY*DPR;});
    addEventListener('mouseout',e=>{ if(!e.relatedTarget){tmx=tmy=-9999;} });
    addEventListener('touchmove',e=>{const t=e.touches[0];if(t){tmx=t.clientX*DPR;tmy=t.clientY*DPR;}},{passive:true});

    let pulses=[];
    addEventListener('pointerdown',e=>{ if(!reduce) pulses.push({x:e.clientX*DPR,y:e.clientY*DPR,r:0}); });

    function frame(){
      if(tmx>-9000){ mx+=(tmx-mx)*.12; my+=(tmy-my)*.12; } else { mx=my=-9999; }
      ctx.clearRect(0,0,w,h);
      const diag=Math.hypot(w,h), SPEED=12*DPR, BAND=48*DPR;
      for(let pi=pulses.length-1;pi>=0;pi--){ pulses[pi].r+=SPEED; if(pulses[pi].r>diag+80*DPR) pulses.splice(pi,1); }

      for(const n of nodes){
        n.depth=0; n.energy*=0.90;
        if(!reduce){
          n.drift+=0.006*n.ds;
          const hx=n.hx+Math.cos(n.drift)*9*DPR, hy=n.hy+Math.sin(n.drift*1.3)*9*DPR;
          n.vx+=(hx-n.x)*0.012; n.vy+=(hy-n.y)*0.012;
          if(mx>-9000){
            const dx=mx-n.x,dy=my-n.y,dist=Math.hypot(dx,dy)||1;
            if(dist<WELL){ const ff=(1-dist/WELL),f=ff*ff; n.vx+=(dx/dist)*f*SINK*DPR; n.vy+=(dy/dist)*f*SINK*DPR; n.depth=ff; }
          }
          for(const P of pulses){
            const dx=n.x-P.x,dy=n.y-P.y,dist=Math.hypot(dx,dy)||1,band=Math.abs(dist-P.r);
            if(band<BAND){ const k=1-band/BAND, fade=Math.max(0,1-P.r/diag);
              n.energy=Math.min(1.4,n.energy+k*fade*0.9); n.vx+=(dx/dist)*k*fade*2.2*DPR; n.vy+=(dy/dist)*k*fade*2.2*DPR; }
          }
          n.vx*=0.86; n.vy*=0.86; n.x+=n.vx; n.y+=n.vy;
        } else { n.x=n.hx; n.y=n.hy; }
        n._g=Math.max(n.depth,Math.min(1,n.energy));
      }

      if(mx>-9000){
        const hr=WELL*1.7;
        let hollow=ctx.createRadialGradient(mx,my,0,mx,my,hr);
        hollow.addColorStop(0,'rgba(2,7,16,.66)'); hollow.addColorStop(.45,'rgba(2,7,16,.30)'); hollow.addColorStop(1,'rgba(2,7,16,0)');
        ctx.fillStyle=hollow; ctx.fillRect(mx-hr,my-hr,hr*2,hr*2);
        ctx.globalCompositeOperation='lighter';
        const rr2=WELL*.98;
        let rim=ctx.createRadialGradient(mx,my,WELL*.22,mx,my,rr2);
        rim.addColorStop(0,'rgba(242,181,68,0)'); rim.addColorStop(.60,'rgba(242,181,68,.08)');
        rim.addColorStop(.82,'rgba(255,205,107,.17)'); rim.addColorStop(1,'rgba(242,181,68,0)');
        ctx.fillStyle=rim; ctx.fillRect(mx-rr2,my-rr2,rr2*2,rr2*2);
        ctx.globalCompositeOperation='source-over';
      }

      const MAXL=132*DPR;
      for(let i=0;i<nodes.length;i++){
        const a=nodes[i];
        for(let j=i+1;j<nodes.length;j++){
          const b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<MAXL){
            const near=Math.max(a._g,b._g),base=(1-d/MAXL)*.15;
            ctx.strokeStyle=near>0?`rgba(242,181,68,${base+near*.5})`:`rgba(201,210,220,${base})`;
            ctx.lineWidth=DPR*(0.55+near*1.1);
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation='lighter';
      for(const n of nodes){
        const rr=n.r*(1+n._g*1.1);
        ctx.beginPath();ctx.arc(n.x,n.y,rr,0,6.2832);
        ctx.fillStyle=n._g>0.02?`rgba(255,205,107,${.4+n._g*.55})`:'rgba(242,181,68,.4)';
        ctx.fill();
      }
      for(const P of pulses){
        const fade=Math.max(0,1-P.r/diag); if(fade<=0) continue;
        ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,6.2832);
        ctx.strokeStyle=`rgba(255,205,107,${.45*fade})`; ctx.lineWidth=DPR*2*fade+.4; ctx.stroke();
        ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,6.2832);
        ctx.strokeStyle=`rgba(242,181,68,${.16*fade})`; ctx.lineWidth=DPR*9*fade; ctx.stroke();
      }
      ctx.globalCompositeOperation='source-over';
      if(!reduce && !document.hidden) nraf=requestAnimationFrame(frame); else nraf=null;
    }
    if(reduce){ mx=my=-9999; }
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden && !reduce && nraf===null) nraf=requestAnimationFrame(frame); });
    frame();
  })();

  /* ---- D3 project network (only if #net + data + d3 present) ---- */
  (function projectNetwork(){
    const svg = document.getElementById('net');
    const dataEl = document.getElementById('net-data');
    if(!svg || !dataEl || !window.d3) return;
    let data; try{ data = JSON.parse(dataEl.textContent); }catch(e){ return; }

    const W=520, H=440;
    const palette = ['#F2B544','#27A98B','#FAF6EE','#7FB2FF'];
    const s = d3.select(svg).attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet');

    const link = s.append('g').attr('stroke','rgba(201,210,220,.22)').attr('stroke-width',1)
      .selectAll('line').data(data.links).join('line');

    const node = s.append('g').selectAll('g').data(data.nodes).join('g').style('cursor','pointer');
    node.append('circle').attr('r',d=>d.r||18)
      .attr('fill',d=>d.group===0?'rgba(242,181,68,.16)':'rgba(14,30,51,.92)')
      .attr('stroke',d=>palette[d.group||0]).attr('stroke-width',d=>d.group===0?2:1.4)
      .style('transition','fill .25s');
    node.append('text').text(d=>d.id).attr('text-anchor','middle').attr('dy',d=>(d.r||18)+15)
      .attr('fill','#C9D2DC').attr('font-size',11).attr('font-family','JetBrains Mono, monospace');

    node.on('mouseenter',function(){ d3.select(this).select('circle').attr('fill','rgba(242,181,68,.3)'); })
        .on('mouseleave',function(e,d){ d3.select(this).select('circle').attr('fill',d.group===0?'rgba(242,181,68,.16)':'rgba(14,30,51,.92)'); })
        .on('click',(e,d)=>{ if(d.anchor){ const t=document.getElementById(d.anchor); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); } });

    const sim = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d=>d.id).distance(d=>d.source.group===0?120:80))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(W/2,H/2))
      .force('collide', d3.forceCollide().radius(d=>(d.r||18)+22))
      .on('tick',()=>{
        data.nodes.forEach(d=>{ d.x=Math.max((d.r||18)+6,Math.min(W-(d.r||18)-6,d.x)); d.y=Math.max((d.r||18)+6,Math.min(H-(d.r||18)-22,d.y)); });
        link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
        node.attr('transform',d=>`translate(${d.x},${d.y})`);
      });

    node.call(d3.drag()
      .on('start',(e,d)=>{ if(!e.active)sim.alphaTarget(.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',(e,d)=>{ d.fx=e.x; d.fy=e.y; })
      .on('end',(e,d)=>{ if(!e.active)sim.alphaTarget(0); d.fx=null; d.fy=null; }));
  })();

  /* ---- ambient sound: generative ethereal pad, opt-in + lazy-loaded (landing only) ---- */
  (function ambientSound(){
    const btn = document.querySelector('[data-sound-toggle]');
    if(!btn) return;
    let started=false, playing=false, master, pad, lead, padLoop;
    const scale=['D4','E4','F#4','A4','B4','D5','E5','F#5','C#5','A5'];
    const chords=[['D3','A3','E4','F#4'],['B2','F#3','D4','C#4'],['G2','D3','A3','B3'],['A2','E3','C#4','E4']];

    let starTimer=null;
    function flyStar(){
      if(reduce || !window.gsap) return;
      const star=document.createElement('div'); star.className='fly-star';
      document.body.appendChild(star);
      const W=innerWidth, H=innerHeight;
      const ox=W*(0.40+Math.random()*0.20), oy=H*(0.34+Math.random()*0.26);   // vanishing point near centre
      const ang=Math.random()*Math.PI*2;
      const dist=Math.max(W,H)*0.8;
      const ex=ox+Math.cos(ang)*dist, ey=oy+Math.sin(ang)*dist;
      const dur=3.8+Math.random()*2.8;                                         // slow drift
      gsap.set(star,{x:ox,y:oy,rotation:ang*180/Math.PI,scale:0.1,opacity:0,transformOrigin:'0% 50%'});
      gsap.timeline({onComplete:()=>star.remove()})
        .to(star,{opacity:.85,duration:dur*0.3,ease:'power1.out'},0)
        .to(star,{x:ex,y:ey,scale:1.15,duration:dur,ease:'power2.in'},0)        // grows → approaches the screen
        .to(star,{opacity:0,duration:dur*0.4,ease:'power1.in'},dur*0.6);
    }
    function startStars(){
      if(reduce) return;
      const tick=()=>{ if(!playing) return; flyStar(); starTimer=setTimeout(tick, 2200+Math.random()*3200); };
      tick();
    }
    function stopStars(){ clearTimeout(starTimer); }

    function loadTone(){
      return new Promise((res,rej)=>{
        if(window.Tone) return res();
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';
        s.onload=()=>res(); s.onerror=rej; document.head.appendChild(s);
      });
    }
    async function build(){
      master=new Tone.Gain(0).toDestination();
      const reverb=new Tone.Reverb(9); await reverb.generate(); reverb.wet.value=0.62; reverb.connect(master);
      const delay=new Tone.FeedbackDelay('4n.',0.42); delay.wet.value=0.26; delay.connect(reverb);
      pad=new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine'},envelope:{attack:5,decay:3,sustain:0.7,release:9},volume:-22}).connect(reverb);
      lead=new Tone.FMSynth({harmonicity:2,modulationIndex:2.4,oscillator:{type:'sine'},modulation:{type:'triangle'},envelope:{attack:0.9,decay:1.2,sustain:0.25,release:7},volume:-13}).connect(delay);
      Tone.Transport.bpm.value=50;
      let ci=0;
      padLoop=new Tone.Loop(time=>{ pad.triggerAttackRelease(chords[ci%chords.length],'1m',time,0.32); ci++; },'2m');
      const note=()=>{ if(!playing) return;
        lead.triggerAttackRelease(scale[(Math.random()*scale.length)|0],'2n',undefined,0.4+Math.random()*0.3);
        Tone.Transport.scheduleOnce(note, `+${1.6+Math.random()*3.6}`);
      };
      build._note=note; started=true;
    }
    async function enable(){
      btn.classList.add('playing'); btn.setAttribute('aria-pressed','true');
      try{ await loadTone(); await Tone.start(); if(!started) await build(); }
      catch(e){ btn.classList.remove('playing'); btn.setAttribute('aria-pressed','false'); return; }
      playing=true;
      try{ padLoop.start(0); }catch(e){}
      if(Tone.Transport.state!=='started') Tone.Transport.start();
      build._note();
      master.gain.rampTo(0.85, 3);
      document.body.classList.add('ambient-on');
      startStars();
    }
    function disable(){
      playing=false;
      document.body.classList.remove('ambient-on'); stopStars();
      btn.classList.remove('playing'); btn.setAttribute('aria-pressed','false');
      if(master) master.gain.rampTo(0, 1.6);
      setTimeout(()=>{ if(playing) return; try{ Tone.Transport.pause(); padLoop && padLoop.stop(); }catch(e){} }, 1700);
    }
    btn.addEventListener('click', ()=> playing ? disable() : enable());
  })();
})();
