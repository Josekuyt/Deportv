/* ===== Datos ===== */
const _SNAP = (window.DEPORTV_SNAPSHOT||{});
const DATA_EMBEBIDA    = _SNAP.events || {"meta":{},"eventos":[]};
const TIERS_EMBEBIDA   = _SNAP.tiers  || {"config":{},"competiciones":{}};
const CANALES_EMBEBIDA = _SNAP.canales|| {"abiertos":[],"de_pago":[]};
let DOC     = DATA_EMBEBIDA;
let TIERS   = TIERS_EMBEBIDA;
let CANALES = CANALES_EMBEBIDA;

const GH_USUARIO = "Josekuyt";
const GH_REPO    = "Deportv";
const GH_RAMA    = "main";

/* Canales "en abierto": la lista vive en canales-abierto.json (editable).
   Respaldo por defecto si el fichero no está disponible. */
const CANALES_DEFECTO = {
  abiertos:["teledeporte","rtve play","la 1","la 2","la 8","aragon","etb","tv3",
    "à punt","a punt","canal sur","telemadrid","tvg","tv canaria","telecartagena",
    "real madrid tv","dazn app gratis","ver gratis","gratis","youtube","twitch"],
  de_pago:["ppv","de pago","premium"],
};

/* Ilustraciones del hero por deporte (exportadas de Figma, en assets/hero/).
   Si falta la del deporte, se usa la genérica; si tampoco, se oculta sin romper. */
const HERO_ILU = "assets/hero-destacados.svg";   // genérica (respaldo)
const HERO_DEP = {
  "Fútbol":"futbol","Fútbol Sala":"futbol","Baloncesto":"baloncesto","Tenis":"tennis",
  "Ciclismo":"ciclismo","Atletismo":"atletismo","Automovilismo":"automovilismo","Fórmula 1":"automovilismo",
  "Fútbol Americano":"football","Golf":"golf","Hockey Hierba":"hockey","MMA":"mma","Boxeo":"mma","MotoGP":"motogp",
};
function ilustracionHero(dep){
  const slug=HERO_DEP[dep];
  return slug ? `assets/hero/${slug}.svg` : HERO_ILU;
}

/* Color de la barra por deporte en el listado. */
const COLOR_DEP = {
  "Fútbol":"#00b341","Fútbol Sala":"#00b341","Fútbol Americano":"#6a1fa0","Baloncesto":"#ff6b00",
  "Tenis":"#0055ff","Ciclismo":"#00b8d4","Golf":"#00b341","Hockey Hierba":"#0055ff","MMA":"#ff0000",
  "Atletismo":"#ffd600","Automovilismo":"#ff0000","Fórmula 1":"#ff0000","MotoGP":"#ff6b00",
  "Balonmano":"#0055ff","Voleibol":"#ff6b00","Natación":"#00b8d4","Rugby":"#6a1fa0","Boxeo":"#ff0000","Béisbol":"#7a7770",
};
function colorDep(d){ return COLOR_DEP[d] || "#00b341"; }

/* Logos de canal.
   Se busca automáticamente la imagen en  assets/canales/<marca>.png
   (la <marca> se calcula con marcaCanal). Si el archivo no existe, se muestra un
   cuadradito con iniciales y color (no se rompe nada). Puedes forzar una ruta
   concreta en LOGOS_CANAL para casos especiales. */
const LOGOS_CANAL = { /* "Nombre exacto del canal":"assets/canales/loquesea.png" */ };
function slugCanal(nombre){
  let s=norm(nombre);
  s=s.replace(/\([^)]*\)/g," ");   // quita "(M54 O110)", "(Ver en directo)", etc.
  s=s.replace(/:.*/,"");           // quita todo tras ":" (p.ej. ": VER PARTIDO")
  s=s.replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  return s || "canal";
}
/* Marca = nombre del archivo del logo. Se resuelve por palabra clave (agrupa
   muchas variantes en un solo logo). Reglas clave pedidas:
   - cualquier cosa "M+"/"Movistar" -> movistar-plus ; "DAZN" -> dazn ;
     "Orange TV" -> orange ; "LaLiga" que no sea DAZN ni M+ -> laliga.
   - "youtube" va AL FINAL: si la marca tiene logo propio (FIBA, Win Sports,
     SeFutbol...) se usa ese; los feeds de YouTube genéricos caen en youtube. */
const MARCAS_KW=[
  [/\bdazn\b/,"dazn"],
  [/movistar|(^|[^a-z])m\+/,"movistar-plus"],
  [/orange/,"orange"],
  [/laliga/,"laliga"],
  [/\batp\b/,"atp"],
  [/\bwta\b/,"wta"],
  [/\bfiba\b/,"fiba"],
  [/win sports/,"win-sports"],
  [/sefutbol/,"sefutbol"],
  [/\brcn\b/,"rcn"],
  [/rfef/,"rfef"],
  [/\bnwsl\b/,"nwsl"],
  [/zapping/,"zapping"],
  [/eurovision/,"eurovision-sports"],
  [/eurosport/,"eurosport"],
  [/onefootball/,"onefootball"],
  [/hbo/,"hbo-max"],
  [/fanatiz/,"fanatiz"],
  [/teledeporte/,"teledeporte"],
  [/rtve/,"rtve-play"],
  [/lpf/,"lpf-play"],
  [/\bla 1\b/,"la-1-tve"],
  [/youtube/,"youtube"],
];
function marcaCanal(nombre){
  const n=norm(nombre);
  for(const [pat,br] of MARCAS_KW){ if(pat.test(n)) return br; }
  // Sin regla conocida: slug con colapso de variantes de feed/calidad.
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
function logoCanal(nombre){
  const src=LOGOS_CANAL[nombre] || `assets/canales/${marcaCanal(nombre)}.png`;
  return `<img class="canal-logo" src="${src}" alt="" loading="lazy" `+
    `data-ini="${esc(inicialesCanal(nombre))}" data-col="${colorCanal(nombre)}" onerror="logoFallback(this)">`;
}
// Si el logo no existe (404), se sustituye por el cuadradito de iniciales.
function logoFallback(img){
  const s=document.createElement("span");
  s.className="canal-logo mono";
  s.style.background=img.dataset.col||"#555";
  s.textContent=img.dataset.ini||"?";
  img.replaceWith(s);
}

/* Aviso breve (toast). */
let _toastT=null;
function toast(msg){
  const el=$("#toast"); if(!el) return;
  el.textContent=msg; el.classList.add("show");
  clearTimeout(_toastT); _toastT=setTimeout(()=>el.classList.remove("show"),2600);
}

/* Evento ya finalizado (solo aplica a HOY; delay global de 3 h desde el inicio). */
const DELAY_FIN_MS = 3*60*60*1000;
function finalizado(e){
  if(e.fecha!==hoyISO()) return false;
  const dt=new Date(`${e.fecha}T${(e.hora||"00:00")}:00`);
  if(isNaN(dt)) return false;
  return (Date.now()-dt.getTime()) > DELAY_FIN_MS;
}

/* Configuración por defecto si competiciones.json no trae "config". */
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

const $ = s => document.querySelector(s);
const norm = t => (t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
let diaActivo = 0;               // índice de pestaña (0=Hoy)
const MOTOR_KEYS = ["formula 1","motogp"];

/* ===== Persistencia (localStorage) =====
   Se guardan: plataformas contratadas, favoritos (competiciones), tema y notificaciones. */
const LS = {
  plat:"deportv:misPlataformas",
  favC:"deportv:favCompeticiones", tema:"deportv:tema",
  notif:"deportv:notif", notifHechas:"deportv:notifHechas",
};
function lsGet(k, def){ try{ const v=localStorage.getItem(k); return v==null?def:JSON.parse(v); }catch(e){ return def; } }
function lsSet(k, val){ try{ localStorage.setItem(k, JSON.stringify(val)); }catch(e){} }

let misPlataformas = new Set(lsGet(LS.plat, []));
let favComps       = new Set(lsGet(LS.favC, []));   // solo competiciones favoritas
let tema           = lsGet(LS.tema, "auto");
// Config de notificaciones (por defecto: apagadas, favoritas + destacados, 15 min).
const NOTIF_DEF={on:false, favs:true, dest:true, lead:15};
let notifCfg = Object.assign({}, NOTIF_DEF, lsGet(LS.notif, {}));

function guardarPlataformas(){ lsSet(LS.plat, [...misPlataformas]); }
function guardarFavoritos(){ lsSet(LS.favC, [...favComps]); }
function guardarNotif(){ lsSet(LS.notif, notifCfg); }

/* ===== Tema ===== */
function aplicarTema(){
  const r=document.documentElement;
  if(tema==="claro"||tema==="oscuro") r.setAttribute("data-tema", tema);
  else r.removeAttribute("data-tema");   // auto = preferencia del sistema
}
function setTema(t){ tema=t; lsSet(LS.tema, t); aplicarTema(); pintarSeg(); }

/* ===== Favoritos (solo competiciones) ===== */
function esFavorito(e){ return !!(e.competicion && favComps.has(e.competicion)); }
function toggleFavComp(c){ if(!c)return; favComps.has(c)?favComps.delete(c):favComps.add(c);
  guardarFavoritos(); pintarTodo(); }

/* ===== Notificaciones locales (solo con la web abierta) ===== */
// Momento de inicio del evento en ms (a partir de fecha "YYYY-MM-DD" y hora "HH:MM").
function inicioEventoMs(e){
  if(!e.fecha||!e.hora||!/^\d{1,2}:\d{2}/.test(e.hora)) return NaN;
  const d=new Date(e.fecha+"T"+e.hora.slice(0,5)+":00");
  return d.getTime();
}
// ¿Este evento debe avisar, según la config y el disparador (favoritas o destacados)?
function esNotificable(e){
  if(!( (notifCfg.favs && esFavorito(e)) || (notifCfg.dest && e._dest) )) return false;
  return !isNaN(inicioEventoMs(e));
}
// Registro (por día) de avisos ya lanzados, para no repetir al recargar.
function notifHechasHoy(){
  const r=lsGet(LS.notifHechas,{}); const hoy=hoyISO();
  return (r&&r.fecha===hoy&&Array.isArray(r.ids)) ? new Set(r.ids) : new Set();
}
function marcarNotifHecha(clave){
  const s=notifHechasHoy(); s.add(clave);
  lsSet(LS.notifHechas,{fecha:hoyISO(), ids:[...s]});
}
// Chequeo periódico: lanza el aviso cuando el evento entra en la ventana de antelación.
function comprobarAvisos(){
  if(!notifCfg.on) return;
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  const ahora=Date.now(), lead=(notifCfg.lead||15)*60000, ya=notifHechasHoy();
  for(const e of (DOC.eventos||[])){
    if(!esNotificable(e)) continue;
    const ini=inicioEventoMs(e);
    // Ventana: desde "lead" antes del inicio hasta el inicio (no avisa si ya empezó).
    if(ahora>=ini-lead && ahora<ini){
      const clave=claveEvento(e);
      if(ya.has(clave)) continue;
      lanzarAviso(e, ini-ahora); marcarNotifHecha(clave);
    }
  }
}
function lanzarAviso(e, restanteMs){
  const mins=Math.max(0,Math.round(restanteMs/60000));
  const quien=(e.local&&e.visitante)?`${e.local} vs ${e.visitante}`:(e.evento||e.competicion||"Evento");
  const canal=(e.canales&&e.canales[0])?` · ${e.canales[0]}`:"";
  const cuando=mins<=0?"empieza ya":`en ${mins} min`;
  try{
    const n=new Notification("⚽ "+quien, {
      body:`${e.competicion||e.deporte||""} · ${e.hora} (${cuando})${canal}`,
      tag:claveEvento(e),
    });
    n.onclick=()=>{ window.focus(); n.close(); };
  }catch(err){}
}
let notifTimer=null;
function iniciarMotorAvisos(){
  if(notifTimer) return;
  notifTimer=setInterval(comprobarAvisos, 30000);   // cada 30 s
  comprobarAvisos();                                 // y una comprobación inmediata
}

/* ===== Utilidades de fecha ===== */
function hoyISO(){ const d=new Date(),z=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function addDias(iso,n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n);
  const z=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function diaLargo(iso){ if(!iso)return "Sin fecha"; const d=new Date(iso+"T00:00:00");
  const s=d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
  return s.charAt(0).toUpperCase()+s.slice(1); }
function unicos(a){ return [...new Set(a)].sort((x,y)=>x.localeCompare(y,"es")); }

/* Fechas de las pestañas: hoy, +1, +2; si no hay datos de hoy, las 3 primeras disponibles. */
function fechasTabs(){
  const hoy=hoyISO();
  const todas=unicos((DOC.eventos||[]).map(e=>e.fecha).filter(Boolean));
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

/* ===== Puntuación / Destacados (tier list) ===== */
function fmtSello(iso){ if(!iso)return "—"; const d=new Date(iso); if(isNaN(d))return iso;
  return d.toLocaleString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
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
function seleccionDestacados(){
  const C=cfg(), MAX=C.max_destacados, MAXCOMP=C.max_por_competicion;
  const dia=fechasTabs()[0]||hoyISO();
  const cand=(DOC.eventos||[]).filter(e=>e.fecha===dia).map(e=>({e,s:relevancia(e)})).filter(x=>x.s>0);
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
function claveEvento(e){ return [e.fecha,e.hora,e.evento].join("|"); }
function marcarDestacados(){
  const sel=seleccionDestacados(); const claves=new Set(sel.map(claveEvento));
  (DOC.eventos||[]).forEach(e=>{ e._dest=claves.has(claveEvento(e)); }); DOC._destacados=sel;
}

/* ===== Render hero (carrusel de destacados) ===== */
function renderDestacados(){
  const track=$("#heroTrack"), sec=$("#destacados"), dots=$("#heroDots"), dest=DOC._destacados||[];
  if(!dest.length){ sec.style.display="none"; return; }
  sec.style.display="block";
  $("#destCount").textContent=dest.length;
  track.innerHTML=dest.map(e=>{
    const canal=(e.canales&&e.canales[0])?e.canales[0]:"";
    const extra=(e.canales&&e.canales.length>1)?` +${e.canales.length-1}`:"";
    const comp=[e.competicion,e.ronda].filter(Boolean).map(esc).join(" — ");
    return `<article class="hero">
      <div class="hero-info">
        <div class="hero-tagrow">
          <span class="hero-tag">${esc(e.deporte||"?")}</span>
          <span class="hero-comp">${comp}</span>
        </div>
        <div class="hero-ev">${esc(e.evento||"—")}</div>
        <div class="hero-time">${esc(e.hora||"--:--")}</div>
        ${canal?`<div class="hero-canal">${esc(canal)}${extra}</div>`:""}
      </div>
      <div class="hero-media">
        <img class="hero-illu" src="${ilustracionHero(e.deporte)}" alt="" onerror="this.onerror=null;this.src='${HERO_ILU}'">
      </div>
    </article>`;
  }).join("");
  dots.innerHTML=dest.map((_,j)=>`<i class="${j===0?'on':''}" data-go="${j}"></i>`).join("");
  dots.querySelectorAll("i").forEach(d=>d.addEventListener("click",()=>{
    const cards=track.querySelectorAll(".hero"); const j=+d.dataset.go;
    if(cards[j]) cards[j].scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  }));
  // Actualiza el dot activo al hacer scroll del carrusel
  track.onscroll=()=>{
    const cards=[...track.querySelectorAll(".hero")];
    const c=track.scrollLeft+track.clientWidth/2;
    let idx=0,best=1e9;
    cards.forEach((card,i)=>{ const mid=card.offsetLeft+card.clientWidth/2; const d=Math.abs(mid-c); if(d<best){best=d;idx=i;} });
    dots.querySelectorAll("i").forEach((i,k)=>i.classList.toggle("on",k===idx));
  };
}

/* ===== Filtros ===== */
function poblarFiltros(){
  const ev=DOC.eventos;
  const deps=unicos(ev.map(e=>e.deporte).filter(Boolean));
  const comps=unicos(ev.map(e=>e.competicion).filter(Boolean));
  const canales=unicos(ev.flatMap(e=>e.canales||[]));
  const prev={dep:$("#fDep").value,comp:$("#fComp").value,canal:$("#fCanal").value};
  const opt=(v,t)=>`<option value="${v}">${t}</option>`;
  $("#fDep").innerHTML=opt("","Todos")+deps.map(d=>opt(d,d)).join("");
  $("#fComp").innerHTML=opt("","Todas")+comps.map(c=>opt(c,c)).join("");
  $("#fCanal").innerHTML=opt("","Todos")+canales.map(c=>opt(c,c)).join("");
  const set=(id,v,l)=>{ if(l.includes(v))$(id).value=v; };
  set("#fDep",prev.dep,deps); set("#fComp",prev.comp,comps); set("#fCanal",prev.canal,canales);

  // Plataformas: desplegable para añadir + chips de las seleccionadas (compacto).
  $("#addPlat").innerHTML=`<option value="">Selecciona una plataforma para añadir</option>`+
    canales.filter(c=>!misPlataformas.has(c)).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  renderPlatList();

  // Favoritos: desplegable con TODAS las competiciones conocidas, agrupado por deporte.
  const porDepComp={};
  const add=(dep,comp)=>{ (porDepComp[dep]=porDepComp[dep]||new Set()).add(comp); };
  const depDeComp={};
  for(const e of ev){ if(e.deporte&&e.competicion) depDeComp[e.competicion]=e.deporte; }
  const cat=(TIERS&&TIERS.competiciones)?TIERS.competiciones:{};
  const depsDe=comp=>{
    const d=(cat[comp]&&cat[comp].deporte)||depDeComp[comp];
    if(Array.isArray(d)) return d.length?d:[GRUPO_OTRAS];
    return [d||GRUPO_OTRAS];
  };
  for(const comp of Object.keys(cat)){ for(const d of depsDe(comp)) add(d, comp); }
  for(const e of ev){ if(e.deporte&&e.competicion&&!cat[e.competicion]) add(e.deporte, e.competicion); }
  $("#addFavComp").innerHTML=`<option value="">Selecciona una competición para añadir</option>`+
    optgroupsHTML(porDepComp, favComps);

  renderFavListas();
  const m=DOC.meta||{};
  $("#metaSrc").innerHTML=`Fuente actualizada: <b>${fmtSello(m.generado)}</b><br>Número de eventos: <b>${(DOC.eventos||[]).length}</b>`;
}

// Escapa texto para insertarlo en HTML/atributos.
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;")
  .replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// Grupo de reserva para competiciones del catálogo sin deporte conocido.
const GRUPO_OTRAS="Otras competiciones";
// Opciones <optgroup> por deporte, excluyendo lo ya elegido. "Otras" siempre al final.
function optgroupsHTML(mapa, excl){
  return Object.keys(mapa).sort((a,b)=>{
    if(a===GRUPO_OTRAS)return 1; if(b===GRUPO_OTRAS)return -1;
    return a.localeCompare(b,"es");
  }).map(dep=>{
    const items=[...mapa[dep]].filter(x=>!excl.has(x)).sort((a,b)=>a.localeCompare(b,"es"));
    if(!items.length) return "";
    return `<optgroup label="${esc(dep)}">`+
      items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")+`</optgroup>`;
  }).join("");
}
// Chips de plataformas seleccionadas (con quitar).
function renderPlatList(){
  const arr=[...misPlataformas].sort((a,b)=>a.localeCompare(b,"es"));
  $("#nPlat").textContent=arr.length;
  $("#platList").innerHTML=arr.length
    ? arr.map(c=>`<span class="chip-fav">${esc(c)}<button data-plat="${esc(c)}" title="Quitar">✕</button></span>`).join("")
    : `<span class="chips-vacio">Sin plataformas seleccionadas.</span>`;
  $("#platList").querySelectorAll(".chip-fav button").forEach(b=>
    b.addEventListener("click",()=>{ misPlataformas.delete(b.dataset.plat); guardarPlataformas(); pintarTodo(); }));
}

// Lista de competiciones favoritas (chips con botón de quitar) dentro del modal.
function renderFavListas(){
  const comps=[...favComps].sort((a,b)=>a.localeCompare(b,"es"));
  $("#nFavComp").textContent=comps.length;
  $("#favCompList").innerHTML=comps.length
    ? comps.map(c=>`<span class="chip-fav">${esc(c)}<button data-val="${esc(c)}" title="Quitar">✕</button></span>`).join("")
    : `<span class="chips-vacio">Sin competiciones favoritas.</span>`;
  $("#favCompList").querySelectorAll(".chip-fav button").forEach(b=>
    b.addEventListener("click",()=>toggleFavComp(b.dataset.val)));
}

// Segmento de tema: marca el activo.
function pintarSeg(){ document.querySelectorAll("#temaSeg .seg-btn").forEach(b=>
  b.classList.toggle("on", b.dataset.tema===tema)); }
function canalAbierto(c){
  const n=norm(c);
  const src=(CANALES&&CANALES.abiertos&&CANALES.abiertos.length)?CANALES:CANALES_DEFECTO;
  if((src.de_pago||[]).some(k=>n.includes(norm(k)))) return false;   // PPV/premium anula
  return (src.abiertos||[]).some(k=>n.includes(norm(k)));
}
function eventoAbierto(e){ return (e.canales||[]).some(canalAbierto); }
function pasaFiltros(e){
  const q=norm($("#q").value), dep=$("#fDep").value, comp=$("#fComp").value, canal=$("#fCanal").value;
  if(dep&&e.deporte!==dep)return false;
  if(comp&&e.competicion!==comp)return false;
  if(canal&&!(e.canales||[]).includes(canal))return false;
  if($("#soloAbierto").checked && !eventoAbierto(e))return false;
  if($("#soloMias").checked){ if(!misPlataformas.size)return false;
    if(!(e.canales||[]).some(c=>misPlataformas.has(c)))return false; }
  if($("#soloFav").checked && !esFavorito(e))return false;
  if($("#ocultarFin").checked && finalizado(e))return false;
  if(q){ const blob=norm([e.evento,e.competicion,e.deporte,e.local,e.visitante,...(e.canales||[])].join(" "));
    if(!blob.includes(q))return false; }
  return true;
}

/* ===== Pestañas de día + listado ===== */
function renderTabs(){
  const fechas=fechasTabs();
  if(diaActivo>=fechas.length) diaActivo=0;
  $("#tabs").innerHTML=fechas.map((f,i)=>
    `<button class="tab${i===diaActivo?' on':''}" data-i="${i}">${etiquetaTab(f)}</button>`).join("");
  $("#tabs").querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{
    diaActivo=+t.dataset.i; renderTabs(); render();
  }));
}
// Nº de filtros activos (para el badge del botón "Filtros" en móvil).
function actualizarContadorFiltros(){
  let n=0;
  if($("#q").value.trim())n++;
  if($("#fDep").value)n++;
  if($("#fComp").value)n++;
  if($("#fCanal").value)n++;
  if($("#soloAbierto").checked)n++;
  if($("#soloMias").checked)n++;
  if($("#soloFav").checked)n++;
  const b=$("#ftCount"); b.textContent=n; b.hidden=(n===0);
}
function render(){
  actualizarContadorFiltros();
  const fechas=fechasTabs();
  const dia=fechas[diaActivo]||fechas[0];
  const ev=(DOC.eventos||[]).filter(e=>e.fecha===dia).filter(pasaFiltros)
    .sort((a,b)=>(a.hora||"").localeCompare(b.hora||""));
  $("#diaTitulo").innerHTML=`${esc(diaLargo(dia))} <span class="pill">${ev.length} eventos</span>`;
  const lista=$("#lista"); lista.innerHTML="";
  $("#vacio").style.display=ev.length?"none":"block";
  for(const e of ev){
    const row=document.createElement("div");
    row.className="row";
    const canalesHtml=(e.canales||[]).map(c=>{
      const cls="canal"+(misPlataformas.has(c)?" mia":"")+(canalAbierto(c)?" abierto":"");
      return `<span class="${cls}">${logoCanal(c)}<span class="canal-txt">${esc(c)}</span></span>`;
    }).join("");
    const part=(e.local&&e.visitante)
      ? `${esc(e.local)} <span class="vs">vs</span> ${esc(e.visitante)}`
      : esc(e.evento||"—");
    const sub=[e.competicion,e.ronda].filter(Boolean).map(esc).join(" · ");
    const favOn=esFavorito(e);
    const fav=e.competicion
      ? `<button class="row-fav${favOn?" on":""}" data-comp="${esc(e.competicion)}" `+
        `title="${favOn?"Quitar competición de favoritos":"Marcar competición como favorita"}" aria-label="Favorito">${favOn?"★":"☆"}</button>`
      : "";
    row.innerHTML=`
      ${fav}
      <div class="row-hora">${esc(e.hora||"--:--")}</div>
      <div class="row-dep"><span class="dep-bar" style="background:${colorDep(e.deporte)}"></span><span class="dep-name">${esc(e.deporte||"?")}</span></div>
      <div class="row-ev">
        <div class="ev-part">${part}</div>
        ${sub?`<div class="ev-sub">${sub}</div>`:""}
      </div>
      <div class="row-canales">${canalesHtml||'<span class="canal">Sin canal</span>'}</div>`;
    lista.appendChild(row);
  }
}

/* ===== Cabecera dinámica (contador + fecha + reloj) ===== */
function pintarCabecera(){
  $("#hdrCount").textContent=(DOC.eventos||[]).length;
  actualizarReloj();
}
function actualizarReloj(){
  const d=new Date(), z=n=>String(n).padStart(2,"0");
  const f=d.toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
  $("#hdrFecha").textContent=f.replace(/\./g,"").toUpperCase();
  $("#hdrHora").textContent=`${z(d.getHours())}:${z(d.getMinutes())}`;
}

function actualizarPie(){
  const m=DOC.meta||{};
  $("#pie").textContent=`Datos de ${m.fuente||"https://www.futbolenlatv.es/deporte"} · Proyecto Deportv`;
}
function pintarTodo(){ marcarDestacados(); renderDestacados(); poblarFiltros(); renderTabs(); render(); pintarCabecera(); actualizarPie(); comprobarAvisos(); }

/* ===== Carga de datos (CDN + respaldo) ===== */
function fuentes(f){ const o=[]; if(GH_USUARIO!=="USUARIO"&&GH_REPO!=="REPO")
    o.push(`https://raw.githubusercontent.com/${GH_USUARIO}/${GH_REPO}/${GH_RAMA}/${f}`); o.push(f); return o; }
async function fetchJSON(f){ for(const base of fuentes(f)){ try{
    const url=base+(base.includes("?")?"&":"?")+"ts="+Date.now();
    const r=await fetch(url,{cache:"no-store"}); if(!r.ok)continue; return await r.json();
  }catch(e){} } return null; }
async function cargarDatos(){
  let ok=false;
  const [datos,tiers,canales]=await Promise.all([
    fetchJSON("events.json"), fetchJSON("competiciones.json"), fetchJSON("canales-abierto.json")]);
  if(datos&&datos.eventos&&datos.eventos.length){ DOC=datos; ok=true; }
  if(tiers&&tiers.competiciones){ TIERS=tiers; }
  if(canales&&canales.abiertos){ CANALES=canales; }
  return ok;
}

function initEventos(){
  ["q","fDep","fComp","fCanal","soloAbierto","soloMias","soloFav","ocultarFin"].forEach(id=>{
    $("#"+id).addEventListener(id==="q"?"input":"change",render);
  });
  $("#limpiar").addEventListener("click",()=>{
    $("#q").value="";$("#fDep").value="";$("#fComp").value="";$("#fCanal").value="";
    $("#soloAbierto").checked=false;$("#soloMias").checked=false;$("#soloFav").checked=false;
    $("#ocultarFin").checked=true;   // vuelve al valor por defecto (activado)
    render();   // Limpiar filtros NO borra tus plataformas ni favoritos (son preferencias)
  });
  // Estrella de favorito (competición) en las filas del listado.
  $("#lista").addEventListener("click",ev=>{
    const b=ev.target.closest(".row-fav"); if(!b)return;
    toggleFavComp(b.dataset.comp);
  });
  $("#actualizar").addEventListener("click",async()=>{
    const btn=$("#actualizar"),txt=btn.textContent;
    btn.classList.add("cargando"); btn.textContent="Actualizando...";
    const ok=await cargarDatos(); pintarTodo();
    btn.classList.remove("cargando"); btn.textContent=ok?"Actualizado ✓":"Sin conexión";
    setTimeout(()=>{ btn.textContent=txt; },2000);
  });

  // ----- Drawer de filtros (móvil) -----
  const aside=$("#filtros"), backdrop=$("#filtrosBackdrop"), btnFiltros=$("#abrirFiltros");
  const abrirFiltros=()=>{ aside.classList.add("open"); backdrop.hidden=false;
    document.body.style.overflow="hidden"; btnFiltros.setAttribute("aria-expanded","true"); };
  const cerrarFiltros=()=>{ aside.classList.remove("open"); backdrop.hidden=true;
    document.body.style.overflow=""; btnFiltros.setAttribute("aria-expanded","false"); };
  btnFiltros.addEventListener("click",abrirFiltros);
  $("#cerrarFiltros").addEventListener("click",cerrarFiltros);
  backdrop.addEventListener("click",cerrarFiltros);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&aside.classList.contains("open")) cerrarFiltros(); });
  window.addEventListener("resize",()=>{ if(window.innerWidth>960&&aside.classList.contains("open")) cerrarFiltros(); });

  // ----- Modal de Preferencias -----
  const overlay=$("#prefsOverlay");
  const abrir=()=>{ overlay.hidden=false; document.body.style.overflow="hidden"; };
  const cerrar=()=>{ overlay.hidden=true; document.body.style.overflow=""; };
  $("#abrirPrefs").addEventListener("click",abrir);
  $("#cerrarPrefs").addEventListener("click",cerrar);
  overlay.addEventListener("click",e=>{ if(e.target===overlay) cerrar(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!overlay.hidden) cerrar(); });

  // Tema
  document.querySelectorAll("#temaSeg .seg-btn").forEach(b=>
    b.addEventListener("click",()=>setTema(b.dataset.tema)));

  // Añadir favoritos / plataformas desde el menú (al seleccionar, sin botón).
  $("#addFavComp").addEventListener("change",e=>{
    const v=e.target.value; if(v){ favComps.add(v); guardarFavoritos(); pintarTodo(); } });
  $("#addPlat").addEventListener("change",e=>{
    const v=e.target.value; if(v){ misPlataformas.add(v); guardarPlataformas(); pintarTodo(); } });

  // ----- Notificaciones -----
  $("#notifOn").addEventListener("change",e=>{
    if(e.target.checked){
      notifCfg.on=true; guardarNotif(); pintarNotif();
      if(!("Notification" in window)){ pintarNotif(); return; }
      if(Notification.permission==="granted"){ iniciarMotorAvisos(); comprobarAvisos(); }
      else if(Notification.permission!=="denied"){
        Notification.requestPermission().then(p=>{
          pintarNotif();
          if(p==="granted"){ iniciarMotorAvisos(); toast("Notificaciones activadas"); }
        });
      }
    } else { notifCfg.on=false; guardarNotif(); pintarNotif(); }
  });
  $("#notifFav").addEventListener("change",e=>{ notifCfg.favs=e.target.checked; guardarNotif(); comprobarAvisos(); });
  $("#notifDest").addEventListener("change",e=>{ notifCfg.dest=e.target.checked; guardarNotif(); comprobarAvisos(); });
  $("#notifLead").addEventListener("change",e=>{ notifCfg.lead=+e.target.value||15; guardarNotif(); pintarNotif(); comprobarAvisos(); });

  // Limpiar preferencias guardadas
  $("#limpiarCache").addEventListener("click",()=>{
    if(!confirm("¿Borrar tus preferencias (favoritos, plataformas, tema y notificaciones) de este navegador?")) return;
    [LS.plat,LS.favC,LS.tema,LS.notif,LS.notifHechas].forEach(k=>{ try{localStorage.removeItem(k);}catch(e){} });
    misPlataformas=new Set(); favComps=new Set(); tema="auto";
    notifCfg=Object.assign({},NOTIF_DEF);
    aplicarTema(); pintarSeg(); pintarNotif(); pintarTodo();
    toast("Preferencias restablecidas");
  });
}
// Refleja la config de notificaciones en el modal y actualiza la línea de estado.
function pintarNotif(){
  const on=$("#notifOn"); if(!on) return;
  on.checked=notifCfg.on;
  $("#notifFav").checked=notifCfg.favs;
  $("#notifDest").checked=notifCfg.dest;
  $("#notifLead").value=String(notifCfg.lead||15);
  $("#notifOpts").hidden=!notifCfg.on;
  const est=$("#notifEstado"); est.className="notif-estado";
  if(!("Notification" in window)){ est.textContent="Tu navegador no admite notificaciones."; est.classList.add("warn"); return; }
  if(!notifCfg.on){ est.textContent="Desactivadas."; return; }
  const p=Notification.permission;
  if(p==="granted"){ est.textContent=`Activadas. Te avisaré ${notifCfg.lead||15} min antes (con Deportv abierto).`; est.classList.add("ok"); }
  else if(p==="denied"){ est.textContent="Bloqueadas en el navegador. Actívalas en los ajustes del sitio para recibir avisos."; est.classList.add("warn"); }
  else { est.textContent="Pendiente de permiso del navegador."; est.classList.add("warn"); }
}
async function arranca(){ aplicarTema(); pintarSeg(); initEventos(); pintarNotif();
  actualizarReloj(); setInterval(actualizarReloj, 15000);
  if(notifCfg.on && ("Notification" in window) && Notification.permission==="granted") iniciarMotorAvisos();
  await cargarDatos(); pintarTodo(); }
arranca();
