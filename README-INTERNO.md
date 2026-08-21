# Deportv — Documentación interna (desarrollo y despliegue)

> Documento interno: instalación, arquitectura, actualización de datos y configuración.
> Para la descripción pública del proyecto, ver `README.md`.

Visor web de la programación deportiva en TV, con datos extraídos de
[futbolenlatv.es/deporte](https://www.futbolenlatv.es/deporte). Diseñado para
**publicarse en Netlify y actualizarse solo, sin servidor ni PC encendido.**

## Contenido

- `index.html` — visor web con filtros (lee `events.json`).
- `events.json` — datos capturados (188 eventos, 3 días).
- `scraper.py` — scraper en Python (Requests + BeautifulSoup).
- `template.html` + `build.py` — plantilla y script para regenerar `index.html`.
- `competiciones.json` — **tier list editable** de competiciones + configuración de
  puntuación de los destacados.
- `heuristica.py` — heurística de tier (compartida por el scraper y el sembrado).
- `canales-abierto.json` — **lista editable** de canales/plataformas en abierto
  (para el filtro "Mostrar sólo eventos en abierto"). Un canal es abierto si contiene
  una palabra de `abiertos` y ninguna de `de_pago` (anula, p.ej. "ppv").
- `requirements.txt` — dependencias del scraper.
- `.github/workflows/actualizar-datos.yml` — cron gratuito que actualiza los datos.
- `netlify.toml` — configuración de publicación en Netlify.
- `actualizar.sh` — alternativa manual/cron local.
- `estrategia-scraping.md` — análisis de la fuente y comparativa de herramientas.

---

## Cómo funciona la actualización automática (sin servidor)

El visor es una página **estática** publicada en Netlify. Los **datos** (`events.json`)
se sirven desde la **CDN de GitHub** (raw), de modo que se actualizan **sin
redesplegar Netlify**. El scraping lo hace **GitHub Actions** de forma programada y
gratuita (un navegador no puede scrapear futbolenlatv.es directamente por CORS):

```
   GitHub Actions (cron, cada 8 h)  ─►  scraper.py  ─►  commit de events.json
                                                              │
                          ┌───────────────────────────────────┤
                          ▼                                   ▼
   Netlify NO se redespliega            El visor lee events.json desde
   (ignora commits de solo-datos)       la CDN de GitHub (raw) -> datos frescos
```

Ni servidor ni ordenador encendido. El visor muestra siempre **"Fuente actualizada:
<fecha y hora>"** (campo `meta.generado` de `events.json`) y el botón
**"🔄 Actualizar eventos"** recarga los datos desde la CDN sin recargar la página.

> Por qué la CDN: al leer `events.json` desde `raw.githubusercontent.com`, las
> actualizaciones de datos no tocan Netlify. Además, `netlify.toml` incluye una regla
> `ignore` que **cancela el despliegue cuando el único cambio es `events.json`**, así
> que los minutos de build de Netlify no se consumen con las actualizaciones de datos.

### Coste: 0 €

- **GitHub Actions**: gratis (ilimitado en repos públicos; 2.000 min/mes en privados).
  Cada ejecución del scraper dura ~1 minuto; con 3 ejecuciones/día son ~90 min/mes.
- **Netlify (plan Starter)**: gratis. El sitio solo se redespliega cuando cambias el
  código (no con los datos), así que apenas consume build.
- **CDN de GitHub (raw)**: gratis. La caché de `raw.githubusercontent.com` es de ~5
  minutos, más que suficiente con un refresco cada 8 horas.

> Cambiar la frecuencia: edita la línea `cron` en
> `.github/workflows/actualizar-datos.yml`. Actualmente cada 8 horas (`0 */8 * * *`).

---

## Puesta en marcha (paso a paso)

1. **Sube este proyecto a un repositorio de GitHub** (nuevo repo → subir los ficheros).
2. **Repo en el visor (ya preconfigurado)**: `index.html` ya apunta a
   `Josekuyt/Deportv` (rama `main`) para leer `events.json` desde la CDN de GitHub. Si
   cambias de usuario/repo/rama, edita el bloque de configuración al principio del
   `<script>` (`GH_USUARIO`/`GH_REPO`/`GH_RAMA`).
3. **Conecta el repo a Netlify**: *Add new site → Import from Git →* elige el
   repositorio. No hace falta configurar build; `netlify.toml` ya publica la raíz.
4. **Activa el cron**: entra en la pestaña **Actions** de GitHub, habilita los
   workflows si te lo pide, y usa *"Run workflow"* para lanzar el primero a mano y
   comprobar que actualiza `events.json`.
5. Listo: a partir de ahí el scraper corre cada 8 horas y el visor lee los datos desde
   la CDN de GitHub, sin redesplegar Netlify.

> Permisos: el workflow ya incluye `permissions: contents: write`. Si el push fallara,
> revisa en *Settings → Actions → General → Workflow permissions* que esté marcado
> **"Read and write permissions"**.
>
> Nota: para que la CDN raw funcione, el repositorio debe ser **público** (o servir el
> dato por otra vía). Si lo quieres privado, dímelo y te preparo la variante.

---

## Uso local (opcional)

```bash
pip install -r requirements.txt

python scraper.py --print          # scrapea y muestra un resumen
python scraper.py --from-file x.html   # parsea un HTML guardado
python build.py                    # regenera index.html desde la plantilla
python -m http.server 8000         # prueba el visor en http://localhost:8000
```

## Destacados de hoy — sistema de tier list (MVP 0.5)

El visor resalta **solo lo más importante del día actual** en una sección
**"⭐ Destacados de hoy"** (máximo 5) y con una **estrella** en las tarjetas del
listado. La selección se basa en una **tier list de competiciones** definida en el
fichero editable `competiciones.json`.

### Cómo se puntúa

```
puntuación = puntos_por_tier[tier] + bonus_fase + bonus_España
```

- **Tier de la competición** (S/A/B/C/D): se busca la competición por nombre exacto en
  `competiciones.json`. Puntos por defecto: S=100, A=70, B=45, C=25, D=10.
- **Bonus de fase** (progresivo, del campo `ronda` o del nombre del evento): final=40,
  semifinal=25, cuartos=12, octavos=4, resto=0.
- **Bonus España**: +30 si un participante es la selección de España (cualquier deporte).

Se descartan (puntuación 0): competiciones cuyo nombre contenga un término de
`config.excluir` (reservas, juveniles, 2ª división, amistosos, trofeos regionales…);
las sesiones de **Libres/ensayos** de F1/MotoGP; y la **previa de clasificación** de
Champions (los "play-offs" de acceso de jun–ago se excluyen, pero la eliminatoria de
play-offs de febrero se mantiene, distinguido por fecha).

Recorte final: como máximo `config.max_destacados` (5) y `config.max_por_competicion`
(2) por competición, eligiendo el mejor evento de cada una (por puntuación, nº de
canales y horario estelar). Solo cuenta la **fecha de hoy**.

### El fichero `competiciones.json` (editable)

Contiene `config` (puntos por tier, bonus, exclusiones, topes) y `competiciones`
(mapa `"Nombre de competición": { "tier": "S" }`). **Edítalo a mano** para ajustar
tiers o la configuración; el visor lo lee desde la CDN, así que los cambios se aplican
en la siguiente carga (no hace falta re-scrapear ni redesplegar Netlify).

### Autodescubrimiento de competiciones nuevas

Cuando el scraper encuentra una competición que no está en `competiciones.json`, la
**añade automáticamente** con un tier estimado por heurística (`heuristica.py`) y
marcada `"por_revisar": true`, sin tocar las que ya existan (respeta tus ediciones).
El workflow commitea el fichero actualizado. Revisa periódicamente las entradas
`por_revisar` para confirmar o corregir su tier.

> El usuario/repositorio de GitHub (`GH_USUARIO`/`GH_REPO`) ya vienen preconfigurados
> en `index.html`/`template.html`.

## Nota sobre los selectores

El bloque `SEL` de `scraper.py` está ajustado al HTML real de la web y aislado a
propósito: si la web cambia su maquetación, ese es el único punto a tocar. El parser
incluye además una estrategia de respaldo por estructura de tablas.
