#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera js/snapshot.js con una instantánea de los datos (events.json,
competiciones.json, canales-abierto.json) para que la web tenga datos en la
PRIMERA carga aunque la CDN tarde. En producción, app.js además lee los datos
EN VIVO desde la CDN de GitHub; este snapshot es solo el respaldo inicial.

Estructura del proyecto (tras separar CSS/JS):
  index.html            -> marcado; enlaza css/ y js/
  css/tokens.css        -> núcleo compartido: tokens de color, fuentes y reset
  css/app.css           -> estilos de la web
  js/app.js             -> lógica de la web
  js/snapshot.js        -> datos incrustados (ESTE fichero lo genera build.py)
  assets/               -> ilustraciones del hero y logos de canal (compartidos)

Uso:  python build.py
"""
import json, os

def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default

def main():
    snap = {
        "events":  load("events.json",          {"meta": {}, "eventos": []}),
        "tiers":   load("competiciones.json",    {"config": {}, "competiciones": {}}),
        "canales": load("canales-abierto.json",  {"abiertos": [], "de_pago": []}),
    }
    os.makedirs("js", exist_ok=True)
    js = ("/* Generado por build.py — no editar a mano. */\n"
          "window.DEPORTV_SNAPSHOT = " + json.dumps(snap, ensure_ascii=False) + ";\n")
    with open("js/snapshot.js", "w", encoding="utf-8") as f:
        f.write(js)
    n = len(snap["events"].get("eventos", []))
    print(f"js/snapshot.js generado ({len(js)} bytes, {n} eventos)")

if __name__ == "__main__":
    main()
