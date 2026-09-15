#!/usr/bin/env python3
"""
Build the Vite app, then inline every asset into ONE self-contained HTML file.

Why: Streamlit Community Cloud runs a Python process (`streamlit run app.py`) and
cannot serve a directory of static files. The only way to ship a real SPA there is
to embed it into the component iframe as a single document, so all JS/CSS must be
inlined and no external request may be made.

Usage:  python3 scripts/build_singlefile.py
Output: static/exam-coach.html   (committed — Streamlit Cloud has no Node/npm)
"""

import base64
import pathlib
import re
import os
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "static" / "exam-coach.html"


def run(cmd: list[str], env_extra: dict | None = None) -> None:
    print(f"→ {' '.join(cmd)}")
    env = {**os.environ, **(env_extra or {})}
    r = subprocess.run(cmd, cwd=ROOT, env=env)
    if r.returncode != 0:
        sys.exit(f"Build failed: {' '.join(cmd)}")


def build() -> None:
    if not (ROOT / "node_modules").exists():
        run(["npm", "install", "--no-audit", "--no-fund"])
    # SINGLE_FILE makes vite emit one js chunk (no manualChunks split)
    run(["npm", "run", "build"], {"SINGLE_FILE": "1"})


def inline() -> str:
    html = (DIST / "index.html").read_text(encoding="utf-8")

    # 1. inline stylesheets: <link rel="stylesheet" href="./assets/x.css">
    def css_repl(m: re.Match) -> str:
        p = DIST / m.group(1).lstrip("./")
        return f"<style>\n{p.read_text(encoding='utf-8')}\n</style>"

    html = re.sub(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>', css_repl, html)

    # 2. inline module scripts: <script type="module" src="./assets/x.js"></script>
    def js_repl(m: re.Match) -> str:
        p = DIST / m.group(1).lstrip("./")
        js = p.read_text(encoding="utf-8")
        # a closing </script> inside a JS string would end the tag early
        js = js.replace("</script>", "<\\/script>")
        return f'<script type="module">\n{js}\n</script>'

    html = re.sub(
        r'<script[^>]+type="module"[^>]+src="([^"]+\.js)"[^>]*>\s*</script>', js_repl, html
    )

    # 3. inline icons referenced by the HTML (avoid 404 noise)
    def img_repl(m: re.Match) -> str:
        p = DIST / m.group(1).lstrip("./")
        if not p.exists():
            return ""
        b64 = base64.b64encode(p.read_bytes()).decode()
        return f'href="data:image/png;base64,{b64}"'

    html = re.sub(r'href="(\./icons/[^"]+\.png)"', img_repl, html)

    # 4. PWA-only extras that Streamlit cannot serve.
    #    The web manifest and service worker need real same-origin URLs; inside the
    #    component iframe they would 404, so they are dropped here. The app is coded
    #    to degrade gracefully without them (registration is feature-detected).
    html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', "", html)
    html = html.replace('<link rel="apple-touch-icon" href="./icons/icon-192.png" />', "")

    # 5. drop any leftover references to files Streamlit cannot serve
    html = re.sub(r'<link[^>]+rel="modulepreload"[^>]*>', "", html)
    html = html.replace("./sw.js", "")

    # 6. make sure the phone renders it correctly inside the iframe
    if "viewport-fit=cover" not in html:
        html = html.replace(
            '<meta name="viewport"',
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"',
            1,
        )

    return html


def main() -> None:
    build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inline()
    OUT.write_text(html, encoding="utf-8")
    kb = len(html.encode()) / 1024
    print(f"✅ {OUT.relative_to(ROOT)}  ({kb:.0f} KB, fully self-contained)")
    leftovers = re.findall(r'(?:src|href)="\./[^"]+"', html)
    leftovers = [x for x in leftovers if not x.startswith('href="data:')]
    if leftovers:
        print("⚠️  Warning: external references remain — these will 404 on Streamlit:")
        for x in sorted(set(leftovers)):
            print("   ", x)
    else:
        print("   no external references — safe for Streamlit")


if __name__ == "__main__":
    main()
