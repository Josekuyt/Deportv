# ⚽ Deportv — Deporte en TV

**Consulta y filtra toda la programación deportiva en televisión y streaming, en un
solo lugar.**

Deportv reúne los eventos deportivos que se emiten cada día por televisión y
plataformas de streaming, y te deja encontrar rápidamente lo que te interesa: por
deporte, competición, canal o plataforma, con un buscador global y una sección de
destacados del día. Un proyecto pensado para responder de un vistazo a la pregunta de
siempre: *"¿qué dan hoy y dónde lo veo?"*.

---

## 📋 Resumen

Cada día se televisan cientos de eventos deportivos repartidos entre decenas de
canales y plataformas. Encontrar un partido concreto —o simplemente saber qué merece
la pena ver— suele implicar rebuscar en guías largas e incómodas. Deportv toma esa
información, la estructura y la presenta en una interfaz rápida, filtrable y pensada
para el usuario.

## 🎯 Descripción del proyecto

Deportv es una **aplicación web ligera** que ofrece una experiencia de consulta
superior de la agenda deportiva televisada. El proyecto estructura la programación en
un formato uniforme y la muestra con filtros avanzados, búsqueda y personalización,
con el objetivo de que cada usuario llegue en segundos a los eventos que le importan y
sepa exactamente en qué canal o plataforma puede verlos.

Actualmente se encuentra en fase de desarrollo iterativo (MVP), añadiendo
funcionalidades de forma progresiva.

## ✨ Funcionalidades

- **Agenda diaria completa** de eventos deportivos en TV y streaming, organizada por
  día y ordenada por horario.
- **Filtros avanzados** por deporte, competición, canal/plataforma y fecha.
- **Buscador global** por equipo, evento o competición.
- **Destacados de hoy**: selección automática de los eventos más relevantes del día
  (grandes competiciones y fases decisivas), para ver lo importante de un vistazo.
- **Personalización "Mis plataformas"**: marca las plataformas que tienes contratadas
  y resalta o filtra los eventos que puedes ver con ellas.
- **Datos siempre al día**: la fuente se actualiza automáticamente de forma periódica,
  con indicación visible de la última actualización.
- **Información por evento**: deporte, competición, fase/ronda, participantes, fecha,
  hora y todos los canales/plataformas de emisión.
- **Interfaz responsive** y modo claro/oscuro automático.

## 🚧 Límites y alcance

- **Depende de una fuente externa**: la información procede de una guía pública de
  terceros; la disponibilidad y exactitud de los datos dependen de dicha fuente.
- **Ámbito España**: la programación, los canales y las plataformas están orientados
  al público español.
- **Proyecto en fase MVP**: algunas funcionalidades del roadmap (favoritos,
  notificaciones, app móvil…) todavía no están disponibles.
- **Solo informativo**: Deportv no emite ni enlaza señales de vídeo; se limita a
  informar de qué se emite y en qué canal/plataforma.
- **Sin cuentas ni datos personales**: no requiere registro; la personalización se
  gestiona localmente en el navegador.

## 🧭 Objetivos

El objetivo a largo plazo es convertir Deportv en la forma más cómoda de saber qué
deporte ver y dónde, adaptada a cada usuario. La hoja de ruta contempla:

- Favoritos (equipos, competiciones y eventos guardados).
- Mejoras de experiencia y diseño (iconografía de deportes, logos de canales).
- Notificaciones de próximos eventos.
- Vista "Disponible para mí" (solo lo que puedo ver con mis plataformas).
- Versión instalable como PWA y aplicación Android / Android TV.

## 🛠️ Tecnología

Aplicación web estática (HTML, CSS y JavaScript, sin dependencias externas) con un
proceso de recolección y estructuración de datos en Python. La actualización de datos
está automatizada, por lo que el sitio no necesita un servidor propio en marcha.

## ⚠️ Aviso

Proyecto independiente y sin ánimo de lucro, sin afiliación con las competiciones,
canales, plataformas ni con la fuente de datos original. Todas las marcas y derechos
pertenecen a sus respectivos propietarios. Los datos se ofrecen con fines meramente
informativos y pueden contener errores u omisiones.
