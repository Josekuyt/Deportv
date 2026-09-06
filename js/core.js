/* Deportv — núcleo compartido (lógica pura, sin DOM).
   Lo usa la vista de TV (js/tv.js). La web (js/app.js) mantiene por ahora sus
   propias copias; se puede migrar aquí más adelante para no duplicar. */
(function(global){
  "use strict";

  let TIERS   = {config:{}, competiciones:{}};
  let CANALES = {abiertos:[], de_pago:[]};
  function init(tiers, canales){ if(tiers)TIERS=tiers; if(canales)CANALES=canales; }

  const norm = t => (t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const MOTOR_KEYS = ["formula 1","motogp"];

  /* ===== Fechas ===== */
  function hoyISO(){ const d=new Date(),z=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
  function addDias(iso,n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n);
    const z=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
  function diaLargo(iso){ if(!iso)return "Sin fecha"; const d=new Date(iso+"T00:00:00");
    const s=d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
    return s.charAt(0).toUpperCase()+s.slice(1); }
  function unicos(a){ return [...new Set(a)].sort((x,y)=>x.localeCompare(y,"es")); }
  function fechasTabs(eventos){
    const hoy=hoyISO();
    const todas=unicos((eventos||[]).map(e=>e.fecha).filter(Boolean));
    let base=todas.filter(f=>f>=hoy);
    if(!base.length) base=todas;
    return base.slice(0,3);
  }
  function etiquetaTab(f){
    const hoy=hoyISO();
    if(f===hoy) return "Hoy";
    if(f===addDias(hoy,1)) return "Mañana";
    if(f===addDias(hoy,2)) return "Pasado";
    const d=new Date(f+"T00:00:00");
    return d.toLocaleDateString("es-ES",{weekday:"short",day:"numeric"});
  }
  function fmtSello(iso){ if(!iso)return "—"; const d=new Date(iso); if(isNaN(d))return iso;
    return d.toLocaleString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}); }

  /* ===== Puntuación / Destacados ===== */
  const CONFIG_DEFECTO = {
    puntos_por_tier:{S:100,A:70,B:45,C:25,D:10},
    bonus_fase:{final:40,semifinal:25,cuartos:12,octavos:4,otro:0,ninguno:0},
    bonus_espana:30, tier_por_defecto:"C",
    excluir:["reserva","proyeccion","proyección","academy","sub-","sub ","juvenil",
      "hypermotion","euskadi","amistoso","trofeo","admiral","regional"],
    max_destacados:5, max_por_competicion:2,
  };
  function cfg(){
    const c=(TIERS&&TIERS.config)?TIERS.config:{};
    return {
      puntos_por_tier:c.puntos_por_tier||CONFIG_DEFECTO.puntos_por_tier,
      bonus_fase:c.bonus_fase||CONFIG_DEFECTO.bonus_fase,
      bonus_espana:(c.bonus_espana!=null)?c.bonus_espana:CONFIG_DEFECTO.bonus_espana,
      tier_por_defecto:c.tier_por_defecto||CONFIG_DEFECTO.tier_por_defecto,
      excluir:c.excluir||CONFIG_DEFECTO.excluir,
      max_destacados:c.max_destacados||CONFIG_DEFECTO.max_destacados,
      max_por_competicion:c.max_por_competicion||CONFIG_DEFECTO.max_por_competicion,
    };
  }
  function casaComp(comp,keyword){ const k=norm(keyword).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return new RegExp("(^|[^a-z0-9])"+k+"([^a-z0-9]|$)").test(comp); }
  function nivelFase(ronda){ const r=norm(ronda||"");
    if(!r)return "ninguno";
    if(r.includes("semifinal"))return "semifinal";
    if(r.includes("cuartos")||r.includes("1/4"))return "cuartos";
    if(r.includes("octavos")||r.includes("1/8")||r.includes("dieciseisavos")||r.includes("1/16"))return "octavos";
    if(r.includes("final"))return "final";
    return "otro"; }
  function esFasePreliminar(e){ const r=norm(e.ronda||"");
    if(!r)return false;
    if(/previa|clasificaci|qualy|qualifying/.test(r))return true;
    if(/playoff|play-off/.test(r)){ const mes=parseInt((e.fecha||"0000-00").slice(5,7),10); return (mes>=6&&mes<=8); }
    return false; }
  function esMotorLibres(e){ const comp=norm(e.competicion||"");
    if(!MOTOR_KEYS.some(k=>casaComp(comp,k)))return false;
    return /libres|entrenamient|practice|warm|shakedown/.test(norm((e.evento||"")+" "+(e.ronda||""))); }
  function esEspana(e){ const re=/(^|[^a-z0-9])espana([^a-z0-9]|$)/;
    return re.test(norm(e.local||""))||re.test(norm(e.visitante||"")); }
  function tierDe(comp){ const m=(TIERS&&TIERS.competiciones)?TIERS.competiciones:{};
    const e=m[comp]; return (e&&e.tier)?e.tier:cfg().tier_por_defecto; }
  function relevancia(e){
    const C=cfg(), comp=norm(e.competicion||"");
    if((C.excluir||[]).some(k=>comp.includes(norm(k))))return 0;
    if(esMotorLibres(e))return 0;
    if(esFasePreliminar(e))return 0;
    const tier=tierDe(e.competicion);
    const base=(C.puntos_por_tier[tier]!=null)?C.puntos_por_tier[tier]:0;
    const nf=nivelFase((e.ronda||"")+" "+(e.evento||""));
    const bfase=(C.bonus_fase[nf]!=null)?C.bonus_fase[nf]:0;
    const besp=esEspana(e)?(C.bonus_espana||0):0;
    return base+bfase+besp;
  }
  function nCanales(e){ return (e.canales||[]).length; }
  function puntPrime(e){ const h=parseInt((e.hora||"00:00").slice(0,2),10);
    if(h>=19&&h<=23)return 3-Math.abs(21-h)*0.3; return h>=14?1:0; }
  function cmpMejor(a,b){ if(b.s!==a.s)return b.s-a.s;
    const nc=nCanales(b.e)-nCanales(a.e); if(nc)return nc;
    const pp=puntPrime(b.e)-puntPrime(a.e); if(pp)return pp;
    return (a.e.hora||"").localeCompare(b.e.hora||""); }
  function claveEvento(e){ return [e.fecha,e.hora,e.evento].join("|"); }
  function seleccionDestacados(eventos, dia){
    const C=cfg(), MAX=C.max_destacados, MAXCOMP=C.max_por_competicion;
    dia = dia || (fechasTabs(eventos)[0]||hoyISO());
    const cand=(eventos||[]).filter(e=>e.fecha===dia).map(e=>({e,s:relevancia(e)})).filter(x=>x.s>0);
    const grupos=new Map();
    for(const c of cand){ const k=norm(c.e.competicion||""); if(!grupos.has(k))grupos.set(k,[]); grupos.get(k).push(c); }
    for(const arr of grupos.values()) arr.sort(cmpMejor);
    const sel=[...grupos.values()].map(a=>a[0]); sel.sort(cmpMejor);
    let out=sel.slice(0,MAX);
    if(out.length<MAX && MAXCOMP>1){
      const seg=[]; for(const a of grupos.values()) for(let i=1;i<Math.min(a.length,MAXCOMP);i++) seg.push(a[i]);
      seg.sort(cmpMejor); for(const c of seg){ if(out.length>=MAX)break; out.push(c); } out.sort(cmpMejor);
    }
    return out.map(x=>x.e);
  }

  /* ===== Canales en abierto ===== */
  const CANALES_DEFECTO = {
    abiertos:["teledeporte","rtve play","la 1","la 2","la 8","aragon","etb","tv3",
      "à punt","a punt","canal sur","telemadrid","tvg","tv canaria","telecartagena",
      "real madrid tv","dazn app gratis","ver gratis","gratis","youtube","twitch"],
    de_pago:["ppv","de pago","premium"],
  };
  function canalAbierto(c){
    const n=norm(c);
    const src=(CANALES&&CANALES.abiertos&&CANALES.abiertos.length)?CANALES:CANALES_DEFECTO;
    if((src.de_pago||[]).some(k=>n.includes(norm(k)))) return false;
    return (src.abiertos||[]).some(k=>n.includes(norm(k)));
  }
  function eventoAbierto(e){ return (e.canales||[]).some(canalAbierto); }

  /* ===== Logos de canal ===== */
  const LOGOS_CANAL = {};
  function slugCanal(nombre){
    let s=norm(nombre);
    s=s.replace(/\([^)]*\)/g," ").replace(/:.*/,"");
    s=s.replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    return s || "canal";
  }
  const MARCAS_KW=[
    [/\bdazn\b/,"dazn"],[/movistar|(^|[^a-z])m\+/,"movistar-plus"],[/orange/,"orange"],
    [/laliga/,"laliga"],[/\batp\b/,"atp"],[/\bwta\b/,"wta"],[/\bfiba\b/,"fiba"],
    [/win sports/,"win-sports"],[/sefutbol/,"sefutbol"],[/\brcn\b/,"rcn"],[/rfef/,"rfef"],
    [/\bnwsl\b/,"nwsl"],[/zapping/,"zapping"],[/eurovision/,"eurovision-sports"],
    [/eurosport/,"eurosport"],[/onefootball/,"onefootball"],[/hbo/,"hbo-max"],
    [/fanatiz/,"fanatiz"],[/teledeporte/,"teledeporte"],[/rtve/,"rtve-play"],
    [/lpf/,"lpf-play"],[/\bla 1\b/,"la-1-tve"],[/youtube/,"youtube"],
  ];
  function marcaCanal(nombre){
    const n=norm(nombre);
    for(const [pat,br] of MARCAS_KW){ if(pat.test(n)) return br; }
    let s=slugCanal(nombre), prev="";
    while(prev!==s){ prev=s; s=s.replace(/-(?:\d+|m\d+|hdr|bar|uhd|4k)$/,""); }
    return s || "canal";
  }
  function inicialesCanal(nombre){
    const limpio=(nombre||"").replace(/\([^)]*\)/g,"").replace(/[:+].*$/,"").trim();
    const pal=limpio.split(/\s+/).filter(Boolean);
    if(!pal.length) return "?";
    return (pal.length===1 ? pal[0].slice(0,2) : pal[0][0]+pal[1][0]).toUpperCase();
  }
  function colorCanal(nombre){ let h=0; const s=norm(nombre);
    for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return `hsl(${h%360},52%,42%)`; }
  function logoSrc(nombre){ return LOGOS_CANAL[nombre] || `assets/canales/${marcaCanal(nombre)}.png`; }

  /* ===== Deporte: color e ilustración del hero ===== */
  const COLOR_DEP = {
    "Fútbol":"#00b341","Fútbol Sala":"#00b341","Fútbol Americano":"#6a1fa0","Baloncesto":"#ff6b00",
    "Tenis":"#0055ff","Ciclismo":"#00b8d4","Golf":"#00b341","Hockey Hierba":"#0055ff","MMA":"#ff0000",
    "Atletismo":"#ffd600","Automovilismo":"#ff0000","Fórmula 1":"#ff0000","MotoGP":"#ff6b00",
    "Balonmano":"#0055ff","Voleibol":"#ff6b00","Natación":"#00b8d4","Rugby":"#6a1fa0","Boxeo":"#ff0000","Béisbol":"#7a7770",
  };
  function colorDep(d){ return COLOR_DEP[d] || "#00b341"; }
  const HERO_DEP = {
    "Fútbol":"futbol","Fútbol Sala":"futbol","Baloncesto":"baloncesto","Tenis":"tennis",
    "Ciclismo":"ciclismo","Atletismo":"atletismo","Automovilismo":"automovilismo","Fórmula 1":"automovilismo",
    "Fútbol Americano":"football","Golf":"golf","Hockey Hierba":"hockey","MMA":"mma","Boxeo":"mma","MotoGP":"motogp",
  };
  function ilustracionHero(dep, base){
    base = base==null ? "" : base;   // prefijo de ruta (p.ej. "../" desde /tv)
    const slug=HERO_DEP[dep];
    return slug ? `${base}assets/hero/${slug}.svg` : `${base}assets/hero-destacados.svg`;
  }

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;")
    .replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  global.Core = {
    init, norm, hoyISO, addDias, diaLargo, unicos, fechasTabs, etiquetaTab, fmtSello,
    cfg, relevancia, seleccionDestacados, claveEvento,
    canalAbierto, eventoAbierto, marcaCanal, logoSrc, inicialesCanal, colorCanal,
    colorDep, ilustracionHero, esc,
  };
})(window);
