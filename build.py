#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenera index.html a partir de template.html + los JSON de datos/config."""
import re

def main():
    tpl = open("template.html", encoding="utf-8").read()
    data = open("events.json", encoding="utf-8").read().strip()
    tpl = re.sub(r"/\*__DATA__\*/.*?/\*__END__\*/",
                 lambda m: "/*__DATA__*/" + data + "/*__END__*/", tpl, flags=re.S)
    try:
        tiers = open("competiciones.json", encoding="utf-8").read().strip()
        tpl = re.sub(r"/\*__TIERS__\*/.*?/\*__ENDTIERS__\*/",
                     lambda m: "/*__TIERS__*/" + tiers + "/*__ENDTIERS__*/", tpl, flags=re.S)
    except FileNotFoundError:
        pass
    try:
        canales = open("canales-abierto.json", encoding="utf-8").read().strip()
        tpl = re.sub(r"/\*__CANALES__\*/.*?/\*__ENDCANALES__\*/",
                     lambda m: "/*__CANALES__*/" + canales + "/*__ENDCANALES__*/", tpl, flags=re.S)
    except FileNotFoundError:
        pass
    tpl = re.sub(r'\.replace\(/\[[^\]]*\]/g,""\)',
                 lambda m: '.replace(/[\\u0300-\\u036f]/g,"")', tpl, count=1)
    open("index.html", "w", encoding="utf-8").write(tpl)
    print(f"index.html regenerado ({len(tpl)} bytes)")

if __name__ == "__main__":
    main()
