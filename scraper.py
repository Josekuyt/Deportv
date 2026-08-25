#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deportv - Scraper MVP 0.1
=========================
Extrae la programacion deportiva en TV desde futbolenlatv.es/deporte y la
convierte en una estructura JSON uniforme.

Selectores AJUSTADOS al HTML real de la web (agosto 2026).

Uso:
    python scraper.py                 # scrapea y guarda events.json
    python scraper.py --out datos.json
    python scraper.py --from-file pagina.html   # parsea un HTML ya guardado
    python scraper.py --print         # ademas imprime un resumen por pantalla

Requisitos:
    pip install requests beautifulsoup4 lxml

NOTA sobre el entorno:
    Ejecutar en TU maquina o en un servidor con salida a internet. El sandbox en
    la nube donde se preparo el proyecto bloquea la salida directa al dominio.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

try:
    from heuristica import estimar_tier
except Exception:                      # respaldo si no se encuentra el módulo
    def estimar_tier(_nombre):
        return "C", False

URL = "https://www.futbolenlatv.es/deporte"
COMPETICIONES_JSON = "competiciones.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


# --------------------------------------------------------------------------- #
# 1. Descarga
# --------------------------------------------------------------------------- #
def descargar(url=URL, reintentos=3, espera=2.0):
    """Descarga el HTML de la pagina con reintentos simples."""
    ultimo_error = None
    for intento in range(1, reintentos + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except requests.RequestException as e:
            ultimo_error = e
            print(f"  [aviso] intento {intento}/{reintentos} fallo: {e}",
                  file=sys.stderr)
            time.sleep(espera * intento)
    raise RuntimeError(f"No se pudo descargar {url}: {ultimo_error}")


# --------------------------------------------------------------------------- #
# 2. Utilidades de normalizacion
# --------------------------------------------------------------------------- #
def limpiar(texto):
    """Colapsa espacios y quita saltos de linea."""
    if texto is None:
        return ""
    return re.sub(r"\s+", " ", texto).strip()


def normalizar_fecha(texto):
    """Convierte una cabecera de fecha a ISO YYYY-MM-DD. None si no se reconoce."""
    if not texto:
        return None
    t = texto.lower()
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if m:
        d, mth, y = map(int, m.groups())
        return f"{y:04d}-{mth:02d}-{d:02d}"
    m = re.search(r"(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s+de\s+(\d{4})", t)
    if m:
        d = int(m.group(1))
        mth = MESES.get(m.group(2))
        y = int(m.group(3))
        if mth:
            return f"{y:04d}-{mth:02d}-{d:02d}"
    return None


def _span_texto(td):
    """Devuelve el texto de un <td> priorizando el title de su <span>."""
    if td is None:
        return None
    sp = td.find("span")
    if sp is not None:
        return limpiar(sp.get("title") or sp.get_text()) or None
    return limpiar(td.get_text()) or None


# --------------------------------------------------------------------------- #
# 3. Parseo
# --------------------------------------------------------------------------- #
#
# Estructura real de futbolenlatv.es (validada contra el HTML):
#   table.tablaPrincipal            -> un bloque por dia
#     tr.cabeceraTabla              -> fecha del dia
#     tr (evento):
#       td.hora                     -> "21:00"
#       td.detalles                 -> icono/deporte (img[title]),
#                                      competicion (span.ajusteDoslineas a.internalLink label),
#                                      ronda/fase (span.ajusteDoslineas > span[title])
#       td.local / td.visitante     -> participantes (span[title])   |  o
#       td.eventoUnaColumna         -> evento sin dos participantes (span.eventoUnico)
#       td.canales ul.listaCanales li -> canales/plataformas
#
# >>> ZONA DE SELECTORES <<< (unico punto a tocar si la web cambia)
SEL = {
    "tabla": "table.tablaPrincipal",
    "cabecera_fecha": "cabeceraTabla",
    "hora": "hora",
    "detalles": "detalles",
    "sport_img": "td.detalles img",
    "competicion": "span.ajusteDoslineas label",
    "ronda": "span.ajusteDoslineas > span",
    "local": "local",
    "visitante": "visitante",
    "evento_unico": "eventoUnaColumna",
    "canales_li": "td.canales ul.listaCanales li",
}


def parsear(html):
    """Parser principal (estructura real). Si no extrae nada, usa el respaldo."""
    soup = BeautifulSoup(html, "lxml")
    eventos = _parsear_estructura(soup)
    if eventos:
        return eventos
    return _parsear_heuristico(soup)


def _parsear_estructura(soup):
    eventos = []
    for tabla in soup.select(SEL["tabla"]):
        fecha_actual = None
        for tr in tabla.find_all("tr"):
            clases = tr.get("class", [])
            if SEL["cabecera_fecha"] in clases:
                fecha_actual = normalizar_fecha(tr.get_text(" ", strip=True))
                continue

            hora_td = tr.find("td", class_=SEL["hora"])
            if hora_td is None:
                continue  # no es una fila de evento

            # --- detalles: deporte, competicion, ronda ---
            det = tr.find("td", class_=SEL["detalles"])
            deporte = competicion = ronda = None
            if det is not None:
                img = det.find("img")
                if img is not None:
                    deporte = limpiar(img.get("title") or img.get("alt")) or None
                lab = det.select_one(SEL["competicion"])
                sa = det.select_one("span.ajusteDoslineas")
                if lab is not None:
                    competicion = limpiar(lab.get("title") or lab.get_text()) or None
                elif sa is not None:
                    # Competicion sin enlace: usar el title del span o su texto.
                    competicion = limpiar(sa.get("title") or sa.get_text()) or None
                # Ronda/fase: subspan con title (solo si difiere de la competicion).
                spans = det.select(SEL["ronda"])
                if spans:
                    posible = limpiar(spans[-1].get("title") or spans[-1].get_text()) or None
                    if posible and posible != competicion:
                        ronda = posible

            # --- participantes / nombre del evento ---
            local = visitante = None
            eu = tr.find("td", class_=SEL["evento_unico"])
            if eu is not None:
                nombre = limpiar(eu.get_text()) or None
            else:
                local = _span_texto(tr.find("td", class_=SEL["local"]))
                visitante = _span_texto(tr.find("td", class_=SEL["visitante"]))
                if local and visitante:
                    nombre = f"{local} vs {visitante}"
                else:
                    nombre = local or visitante

            # Fallback: si el evento no tiene nombre propio, usar la competicion.
            if not nombre:
                nombre = competicion

            # --- canales ---
            canales = []
            for li in tr.select(SEL["canales_li"]):
                txt = limpiar(li.get("title") or li.get_text())
                if txt:
                    canales.append(txt)

            eventos.append({
                "deporte": deporte,
                "competicion": competicion,
                "ronda": ronda,
                "evento": nombre,
                "local": local,
                "visitante": visitante,
                "fecha": fecha_actual,
                "hora": limpiar(hora_td.get_text()) or None,
                "canales": canales,
            })
    return eventos


def _parsear_heuristico(soup):
    """Respaldo por estructura de tabla, por si cambian las clases CSS."""
    eventos = []
    fecha_actual = None
    for tabla in soup.find_all("table"):
        for tr in tabla.find_all("tr"):
            f = normalizar_fecha(tr.get_text(" ", strip=True))
            celdas = tr.find_all("td")
            if f and len(celdas) <= 1:
                fecha_actual = f
                continue
            if len(celdas) < 3:
                continue
            hora = None
            for c in celdas:
                mh = re.search(r"\b([01]?\d|2[0-3]):[0-5]\d\b", c.get_text())
                if mh:
                    hora = mh.group(0)
                    break
            textos = [limpiar(c.get_text()) for c in celdas]
            nombre = max(textos, key=len) if textos else ""
            canales = [limpiar(a.get_text()) for a in tr.find_all("a")]
            canales = [c for c in canales if c]
            eventos.append({
                "deporte": None, "competicion": None, "ronda": None,
                "evento": nombre, "local": None, "visitante": None,
                "fecha": fecha_actual, "hora": hora, "canales": canales,
            })
    return eventos


# --------------------------------------------------------------------------- #
# 4. Salida
# --------------------------------------------------------------------------- #
def construir_documento(eventos):
    return {
        "meta": {
            "fuente": URL,
            "generado": datetime.now().isoformat(timespec="seconds"),
            "descripcion": "Programacion deportiva en TV extraida de futbolenlatv.es. MVP 0.1.",
            "total_eventos": len(eventos),
        },
        "eventos": eventos,
    }


def actualizar_competiciones(eventos, ruta=COMPETICIONES_JSON):
    """Autodescubrimiento: añade a la tier list las competiciones nuevas con un
    tier estimado por heurística y marcadas 'por_revisar'. No modifica las que ya
    existan (respeta tus ediciones manuales). Devuelve la lista de nuevas."""
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as fh:
            doc = json.load(fh)
    else:
        # Estructura mínima por si no existiera todavía el fichero.
        doc = {
            "meta": {"descripcion": "Tier list de competiciones para Destacados."},
            "config": {
                "puntos_por_tier": {"S": 100, "A": 70, "B": 45, "C": 25, "D": 10},
                "bonus_fase": {"final": 40, "semifinal": 25, "cuartos": 12,
                               "octavos": 4, "otro": 0, "ninguno": 0},
                "bonus_espana": 30, "tier_por_defecto": "C",
                "excluir": ["reserva", "proyeccion", "academy", "sub-", "sub ",
                            "juvenil", "amistoso", "trofeo", "regional", "euskadi",
                            "hypermotion", "admiral"],
                "max_destacados": 5, "max_por_competicion": 2,
            },
            "competiciones": {},
        }

    comp_map = doc.setdefault("competiciones", {})
    vistas = sorted({e.get("competicion") for e in eventos if e.get("competicion")})
    nuevas = []
    for c in vistas:
        if c not in comp_map:
            tier, _conf = estimar_tier(c)
            comp_map[c] = {"tier": tier, "por_revisar": True}
            nuevas.append((c, tier))

    if nuevas:
        doc.setdefault("meta", {})["actualizado"] = datetime.now().isoformat(timespec="seconds")
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=2)
        print(f"Tier list: {len(nuevas)} competición(es) nueva(s) añadida(s) "
              f"(marcadas por_revisar):")
        for c, t in nuevas:
            print(f"   + [{t}] {c}")
    else:
        print("Tier list: sin competiciones nuevas.")
    return nuevas


def resumen(eventos):
    print(f"\n{'='*60}")
    print(f"  {len(eventos)} eventos capturados")
    print(f"{'='*60}")
    for e in eventos[:20]:
        canales = ", ".join(e.get("canales") or []) or "-"
        print(f"  [{e.get('fecha')} {e.get('hora') or '--:--'}] "
              f"{e.get('deporte') or '?'} / {e.get('competicion') or '?'}")
        print(f"      {e.get('evento') or '?'}  ->  {canales}")
    if len(eventos) > 20:
        print(f"  ... y {len(eventos)-20} eventos mas")


# --------------------------------------------------------------------------- #
# 5. CLI
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Scraper de futbolenlatv.es (MVP 0.1)")
    ap.add_argument("--out", default="events.json", help="fichero JSON de salida")
    ap.add_argument("--from-file", help="parsea un HTML local en lugar de descargar")
    ap.add_argument("--print", dest="imprimir", action="store_true",
                    help="imprime un resumen por pantalla")
    args = ap.parse_args()

    if args.from_file:
        print(f"Leyendo HTML local: {args.from_file}")
        with open(args.from_file, encoding="utf-8") as fh:
            html = fh.read()
    else:
        print(f"Descargando {URL} ...")
        html = descargar()

    eventos = parsear(html)
    if not eventos:
        print("[ERROR] No se extrajo ningun evento. Revisa SEL o el HTML.",
              file=sys.stderr)
        sys.exit(1)

    doc = construir_documento(eventos)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    print(f"OK -> {len(eventos)} eventos guardados en {args.out}")

    # Autodescubrimiento de competiciones nuevas en la tier list.
    actualizar_competiciones(eventos)

    if args.imprimir:
        resumen(eventos)


if __name__ == "__main__":
    main()
