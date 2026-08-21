# -*- coding: utf-8 -*-
"""Heurística de tier para competiciones (compartida por scraper y seed)."""
import re, unicodedata

def norm(t):
    t = (t or "").lower()
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")

def _casa(n, k):
    k = re.escape(norm(k))
    return re.search("(^|[^a-z0-9])" + k + "([^a-z0-9]|$)", n) is not None

_EXCL = ["amistoso","trofeo","reserva","proyeccion","academy","sub-","sub ",
         "juvenil","regional","euskadi","hypermotion","admiral"]
_S = ["champions league","la liga ea sports","laliga ea sports","premier league",
      "mundial","copa del mundo","world cup","eurocopa","formula 1","motogp",
      "roland garros","wimbledon","us open","australian open","open de australia",
      "copa del rey","nations league"]
_A = ["europa league","serie a","bundesliga","ligue 1","libertadores","euroliga",
      "euroleague","nba","supercopa","atp finals","wta finals","masters","wta ",
      "atp ","preolimpico","copa mundial","vuelta a espana","giro","tour de francia"]
_B = ["conference league","sudamericana","mls","wnba","primera nacional",
      "liga colombiana","betplay","asean","nwsl","dimayor","central american",
      "caribbean","concacaf"]

def estimar_tier(nombre):
    """Devuelve (tier, confiable). confiable=False cuando cae al valor por defecto."""
    n = norm(nombre)
    if any(k in n for k in _EXCL):        return "D", True
    if any(_casa(n, k) for k in _S):      return "S", True
    if any(_casa(n, k) for k in _A):      return "A", True
    if any(_casa(n, k) for k in _B):      return "B", True
    return "C", False
