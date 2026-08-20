# Deportv — Análisis de estructura y estrategia de scraping

**Fuente:** https://www.futbolenlatv.es/deporte
**Fecha del análisis:** 19/08/2026
**Alcance:** MVP 0.1 — validación de la captura de datos.

---

## 1. Análisis de la fuente

La página concentra la programación deportiva en televisión y streaming, organizada
por bloques de día (por ejemplo, "Partidos de hoy miércoles, 19/08/2026") y, dentro
de cada bloque, una lista de eventos ordenados por hora.

Cada evento expone estos datos: deporte (icono con su nombre), competición, ronda o
fase, participantes (local y visitante, con escudo/bandera cuando aplica), hora en
formato 24h y uno o varios canales/plataformas de emisión.

### ¿HTML estático o renderizado por JavaScript?

**El contenido es HTML estático servido desde el servidor.** Los eventos se entregan
ya renderizados dentro de tablas (`<tr>`/`<td>`), sin depender de llamadas AJAX ni de
poblado por JavaScript en el cliente. Esto se confirmó al recuperar la página: el
listado completo de eventos viene en el marcado inicial.

**Consecuencia clave:** no hace falta un navegador headless. Una simple petición HTTP
y un parser de HTML son suficientes, lo que simplifica enormemente la solución y la
hace más rápida, ligera y fácil de mantener.

> Nota operativa: el entorno en la nube donde se preparó este proyecto bloquea la
> salida directa a este dominio, por lo que el scraping en vivo se ejecuta y valida en
> tu máquina (o en un servidor con salida a internet). Para poblar el visor con datos
> reales durante esta fase se capturó una instantánea de la página (118 eventos, dos
> días).

---

## 2. Comparativa de herramientas

| Herramienta | Facilidad | Fiabilidad | Mantenimiento | Velocidad | Adecuación a este caso |
|---|---|---|---|---|---|
| **Requests + BeautifulSoup** | Muy alta | Alta (sobre HTML estático) | Muy bajo | Muy alta | ★★★★★ Ideal: el contenido es estático |
| **Requests + lxml** | Alta | Alta | Bajo | La más alta | ★★★★☆ Igual de válido; parsing algo más rápido y con XPath |
| **Playwright** | Media | Muy alta | Medio | Baja (arranca navegador) | ★★☆☆☆ Sobredimensionado; útil solo si hubiera JS |
| **Puppeteer** | Media | Muy alta | Medio | Baja | ★★☆☆☆ Igual que Playwright, además atado a Node.js |
| **Selenium** | Media-baja | Media (drivers frágiles) | Alto | La más baja | ★☆☆☆☆ El más pesado y frágil; no aporta nada aquí |
| **Scrapy** | Media | Alta | Medio | Alta | ★★★☆☆ Excelente si el proyecto crece (colas, pipelines, scheduling) |

### Lectura de la tabla

Como el contenido no requiere ejecución de JavaScript, las herramientas basadas en
navegador (Playwright, Puppeteer, Selenium) añaden coste sin beneficio: son más
lentas (segundos por página frente a milisegundos), consumen mucha más memoria y CPU,
y su mantenimiento es mayor (versiones de navegador y drivers). Solo tendrían sentido
si la web migrara a un frontend que cargue los datos por JavaScript.

---

## 3. Recomendación

**Para el MVP: Requests + BeautifulSoup (con `lxml` como parser).**

Motivos: el contenido es estático, así que esta combinación es la más simple, rápida
y fácil de mantener; una captura completa tarda milisegundos y apenas consume
recursos; y el código queda claro y con los selectores aislados en un único punto,
fácil de ajustar si la web cambia.

**Plan de evolución:** si más adelante se necesita scraping periódico a gran escala,
reintentos avanzados, deduplicación o guardado en base de datos, el salto natural es
**Scrapy** (mantiene el mismo enfoque sin navegador y añade infraestructura). Se
reservaría **Playwright** únicamente como plan de contingencia si la web pasara a
renderizar por JavaScript.

---

## 4. Modelo de datos — propuesta mejorada

El modelo inicial es correcto. Propongo enriquecerlo para habilitar mejor los filtros
y la personalización previstos, manteniéndolo simple:

```json
{
  "deporte": "Fútbol",
  "competicion": "La Liga EA Sports",
  "ronda": "Jornada 1",
  "evento": "At. Madrid vs Málaga",
  "local": "At. Madrid",
  "visitante": "Málaga",
  "fecha": "2026-08-19",
  "hora": "21:00",
  "canales": ["M+ LALIGA (M54 O110)", "Movistar Plus+", "Orange Fútbol 1 (107)"]
}
```

Mejoras aplicadas respecto al modelo original y por qué:

- **`local` y `visitante` separados** además de `evento`: permite filtrar y buscar por
  equipo concreto, no solo por el texto completo del partido.
- **`fecha` en ISO `YYYY-MM-DD`** y **`hora` en `HH:MM` 24h**: formatos ordenables y
  sin ambigüedad regional, imprescindibles para ordenar y agrupar por día.
- **`canales` como lista**: un evento suele emitirse en varias señales; una lista es lo
  natural para el filtro "por canal/plataforma" y para la personalización.
- **`local`/`visitante` a `null`** en eventos sin dos participantes (ciclismo, golf,
  MMA…), conservando `evento` como descripción.
- **`ronda`** (fase/jornada, p. ej. "1/8 de final", "3ª Ronda"): ya implementado, se
  extrae cuando la fuente lo indica.

Campos opcionales a considerar en fases posteriores: `deporte_id`/`competicion_id`
(claves normalizadas) y una separación fina entre `canal` (TV lineal) y `plataforma`
(streaming) si se quiere distinguirlos; en la fuente aparecen mezclados, por lo que de
momento se agrupan bajo `canales`.

---

## 5. Estado del MVP 0.1

Objetivos de validación y su estado:

- Conectarse a la página — resuelto (`scraper.py`, ejecutar en tu máquina).
- Obtener todos los eventos visibles — **188 eventos capturados (3 días)** con los
  selectores ajustados al HTML real.
- Extraer los datos relevantes — deporte, competición, ronda, evento, participantes,
  fecha, hora y canales.
- Estructura uniforme — `events.json` con esquema estable y `meta.generado` (fecha de
  la captura).
- Mostrar en pantalla — `scraper.py --print` (consola) y `index.html` (visor web con
  filtros por deporte, competición, canal/plataforma, fecha, búsqueda, personalización
  de "mis plataformas", botón "Actualizar eventos" y sello de última actualización).
