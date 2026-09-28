"""Monta o index.html juntando src/game.html com a física de src/physics.js.

Uso (na pasta do projeto):  python tools/build.py
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
core = (root / "src" / "physics.js").read_text(encoding="utf-8")
core = core.split("/*CORE_START*/")[1].split("/*CORE_END*/")[0]
page = (root / "src" / "game.html").read_text(encoding="utf-8").replace("/*CORE*/", core)
html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
(root / "index.html").write_text(html, encoding="utf-8")
print("index.html gerado")
