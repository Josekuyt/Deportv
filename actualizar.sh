#!/usr/bin/env bash
# Regenera events.json ejecutando el scraper. Pensado para lanzarse por cron.
# Uso:  ./actualizar.sh   (desde la carpeta del proyecto)
set -euo pipefail
cd "$(dirname "$0")"
python3 scraper.py --out events.json
echo "[$(date '+%Y-%m-%d %H:%M:%S')] events.json actualizado"
