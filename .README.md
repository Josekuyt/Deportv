# Deportv — MVP 0.1

Visor web de la programación deportiva en TV, con datos extraídos de
[futbolenlatv.es/deporte](https://www.futbolenlatv.es/deporte). Diseñado para
**publicarse en Netlify y actualizarse solo, sin servidor ni PC encendido.**

## Contenido

- `index.html` — visor web con filtros (lee `events.json`).
- `events.json` — datos capturados (188 eventos, 3 días).
- `scraper.py` — scraper en Python (Requests + BeautifulSoup).
- `template.html` + `build.py` — plantilla y script para regenerar `index.html`.
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
2. **Configura tu repo en el visor**: abre `index.html` y, al principio del `<script>`,
   sustituye en el bloque de configuración:

   ```js
   const GH_USUARIO = "USUARIO";   // tu usuario/organización de GitHub
   const GH_REPO    = "REPO";      // el nombre del repositorio
   const GH_RAMA    = "main";      // tu rama principal (normalmente main)
   ```

   (Si prefieres, edita `template.html` y ejecuta `python build.py` para regenerar
   `index.html`.) Si dejas los valores por defecto, el visor usará el `events.json`
   local como respaldo.
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

## Nota sobre los selectores

El bloque `SEL` de `scraper.py` está ajustado al HTML real de la web y aislado a
propósito: si la web cambia su maquetación, ese es el único punto a tocar. El parser
incluye además una estrategia de respaldo por estructura de tablas.
