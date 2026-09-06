/* Deportv — lógica de la vista de TV (10-foot, navegación con mando). */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const C = window.Core;

  /* ===== Datos ===== */
  const SNAP = window.DEPORTV_SNAPSHOT || {};
  let DOC     = SNAP.events  || {meta:{}, eventos:[]};
  let TIERS   = SNAP.tiers   || {config:{}, competiciones:{}};
  let CANALES = SNAP.canales || {abiertos:[], de_pago:[]};
  C.init(TIERS, CANALES);

  const GH = "https://raw.githubusercontent.com/Josekuyt/Deportv/main/";
  async function fetchJSON(f){
    for(const base of [GH+f, f]){
      try{ const url=base+(base.includes("?")?"&":"?")+"ts="+Date.now();
        const r=await fetch(url,{cache:"no-store"}); if(r.ok) return await r.json();
      }catch(e){}
    }
    return null;
  }
  async function cargarDatos(){
    const [d,t,c]=await Promise.all([fetchJSON("events.json"),fetchJSON("competiciones.json"),fetchJSON("canales-abierto.json")]);
    if(d&&d.eventos&&d.eventos.length) DOC=d;
    if(t&&t.competiciones) TIERS=t;
    if(c&&c.abiertos) CANALES=c;
    C.init(TIERS,CANALES);
  }

  /* ===== Favoritos (compartidos con la web vía localStorage) ===== */
  const LS_FAV="deportv:favCompeticiones";
  function lsGet(k,def){ try{const v=localStorage.getItem(k);return v==null?def:JSON.parse(v);}catch(e){return def;} }
  function lsSet(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  let favComps = new Set(lsGet(LS_FAV,[]));
  function esFav(e){ return !!(e.competicion && favComps.has(e.competicion)); }
  function toggleFav(comp){ if(!comp)return; favComps.has(comp)?favComps.delete(comp):favComps.add(comp);
    lsSet(LS_FAV,[...favComps]); }

  let diaActivo = 0;

  /* ===== Render ===== */
  function chipHTML(nombre){
    const src=C.logoSrc(nombre), ini=C.esc(C.inicialesCanal(nombre)), col=C.colorCanal(nombre);
    return `<span class="tv-chip"><img src="${src}" alt="" loading="lazy" data-ini="${ini}" data-col="${col}" onerror="tvLogoFallback(this)"><span class="txt">${C.esc(nombre)}</span></span>`;
  }
  window.tvLogoFallback=function(img){
    const s=document.createElement("span"); s.className="mono";
    s.style.background=img.dataset.col||"#555"; s.textContent=img.dataset.ini||"?";
    img.replaceWith(s);
  };

  function pintarCabecera(){
    $("#tvCount").textContent=(DOC.eventos||[]).length;
    reloj();
  }
  function reloj(){
    const d=new Date(),z=n=>String(n).padStart(2,"0");
    $("#tvDate").textContent=d.toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).replace(/\./g,"").toUpperCase();
    $("#tvClock").textContent=`${z(d.getHours())}:${z(d.getMinutes())}`;
  }

  function renderTabs(){
    const fechas=C.fechasTabs(DOC.eventos);
    if(diaActivo>=fechas.length) diaActivo=0;
    $("#tvTabs").innerHTML=fechas.map((f,i)=>
      `<div class="tv-tab focusable${i===diaActivo?' on':''}" tabindex="0" data-nav="tab" data-i="${i}">${C.esc(C.etiquetaTab(f))}</div>`).join("");
  }

  function renderRail(){
    const dia=C.fechasTabs(DOC.eventos)[0]||C.hoyISO();
    const dest=C.seleccionDestacados(DOC.eventos, dia);
    const sec=$("#tvDestSec");
    if(!dest.length){ sec.style.display="none"; return; } sec.style.display="";
    $("#tvRail").innerHTML=dest.map(e=>{
      const comp=[e.competicion,e.ronda].filter(Boolean).map(C.esc).join(" — ");
      return `<div class="tv-card focusable" tabindex="0" data-nav="card" data-comp="${C.esc(e.competicion||"")}">
        <div class="c-info">
          <span class="c-tag">${C.esc(e.deporte||"?")}</span>
          <div class="c-ev">${C.esc(e.evento||"—")}</div>
          <div class="c-hora">${C.esc(e.hora||"--:--")}${comp?` · <span style="color:#0055ff">${comp}</span>`:""}</div>
        </div>
        <div class="c-media"><img src="${C.ilustracionHero(e.deporte,"")}" alt="" onerror="this.onerror=null;this.src='assets/hero-destacados.svg'"></div>
      </div>`;
    }).join("");
  }

  function renderList(){
    const fechas=C.fechasTabs(DOC.eventos);
    const dia=fechas[diaActivo]||fechas[0];
    const ev=(DOC.eventos||[]).filter(e=>e.fecha===dia).sort((a,b)=>(a.hora||"").localeCompare(b.hora||""));
    $("#tvDayTitle").textContent=`${C.diaLargo(dia)} · ${ev.length} eventos`;
    const cont=$("#tvList");
    if(!ev.length){ cont.innerHTML=`<div class="tv-empty">No hay eventos para este día.</div>`; return; }
    cont.innerHTML=ev.map((e,i)=>{
      const part=(e.local&&e.visitante)
        ? `${C.esc(e.local)} <span class="vs">vs</span> ${C.esc(e.visitante)}`
        : C.esc(e.evento||"—");
      const sub=[e.competicion,e.ronda].filter(Boolean).map(C.esc).join(" · ");
      const canales=(e.canales||[]).slice(0,4).map(chipHTML).join("") || `<span class="tv-chip"><span class="txt">Sin canal</span></span>`;
      const fav=esFav(e);
      return `<div class="tv-row focusable" tabindex="0" data-nav="row" data-i="${i}" data-comp="${C.esc(e.competicion||"")}">
        <div class="hora">${C.esc(e.hora||"--:--")}</div>
        <div class="dep"><span class="bar" style="background:${C.colorDep(e.deporte)}"></span><span class="name">${C.esc(e.deporte||"?")}</span></div>
        <div class="ev"><div class="part">${part}</div>${sub?`<div class="sub">${sub}</div>`:""}</div>
        <div class="canales">${canales}<span class="fav${fav?" on":""}">${fav?"★":"☆"}</span></div>
      </div>`;
    }).join("");
  }

  function render(){ renderTabs(); renderRail(); renderList(); pintarCabecera(); }

  /* ===== Navegación con mando (D-pad) — enfoque espacial ===== */
  function focusables(){ return [...document.querySelectorAll(".focusable")].filter(el=>el.offsetParent!==null); }
  function mover(dir){
    const cur=document.activeElement;
    const els=focusables();
    if(!cur || !cur.classList.contains("focusable")){ if(els[0]) els[0].focus(); return; }
    const r=cur.getBoundingClientRect(), cx=(r.left+r.right)/2, cy=(r.top+r.bottom)/2;
    let best=null, bestScore=Infinity;
    for(const el of els){
      if(el===cur) continue;
      const b=el.getBoundingClientRect();
      const dx=(b.left+b.right)/2-cx, dy=(b.top+b.bottom)/2-cy;
      let valid=false, primary=0, secondary=0;
      if(dir==="right"){ valid=dx>6; primary=dx; secondary=Math.abs(dy); }
      else if(dir==="left"){ valid=dx<-6; primary=-dx; secondary=Math.abs(dy); }
      else if(dir==="down"){ valid=dy>6; primary=dy; secondary=Math.abs(dx); }
      else if(dir==="up"){ valid=dy<-6; primary=-dy; secondary=Math.abs(dx); }
      if(!valid) continue;
      const score=primary + secondary*2;
      if(score<bestScore){ bestScore=score; best=el; }
    }
    if(best){ best.focus(); best.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"}); }
  }
  function activar(){
    const el=document.activeElement; if(!el||!el.classList.contains("focusable")) return;
    const nav=el.dataset.nav;
    if(nav==="tab"){ diaActivo=+el.dataset.i; render(); const t=document.querySelector(`.tv-tab[data-i="${diaActivo}"]`); if(t)t.focus(); }
    else if(nav==="row"){ toggleFav(el.dataset.comp); const idx=el.dataset.i; renderList();
      const again=document.querySelector(`.tv-row[data-i="${idx}"]`); if(again)again.focus(); }
    else if(nav==="card"){ toggleFav(el.dataset.comp); renderList(); }
  }
  document.addEventListener("keydown",ev=>{
    const k=ev.key;
    if(k==="ArrowRight"){ ev.preventDefault(); mover("right"); }
    else if(k==="ArrowLeft"){ ev.preventDefault(); mover("left"); }
    else if(k==="ArrowUp"){ ev.preventDefault(); mover("up"); }
    else if(k==="ArrowDown"){ ev.preventDefault(); mover("down"); }
    else if(k==="Enter"||k===" "){ ev.preventDefault(); activar(); }
  });

  /* ===== Arranque ===== */
  async function arranca(){
    render();
    reloj(); setInterval(reloj, 15000);
    const first=document.querySelector(".tv-tab"); if(first) first.focus();
    await cargarDatos();
    render();
    const t=document.querySelector(`.tv-tab[data-i="${diaActivo}"]`); if(t)t.focus();
  }
  arranca();
})();
