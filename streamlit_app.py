"""
Exam Coach — Streamlit Community Cloud entrypoint.

Streamlit cannot serve a static PWA, so the built app is inlined into ONE HTML
file (static/exam-coach.html) and mounted full-screen inside Streamlit's
component iframe. All app state lives in the browser (IndexedDB + localStorage),
so it survives Streamlit reruns and app sleeps.

Deploy: https://share.streamlit.io/deploy → repo → branch `main` →
        main file path: `streamlit_app.py`
"""

import pathlib

import streamlit as st
import streamlit.components.v1 as components

BUNDLE = pathlib.Path(__file__).parent / "static" / "exam-coach.html"

st.set_page_config(
    page_title="Exam Coach",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items={},
)

# Strip Streamlit chrome so the embedded app looks like a real mobile app.
HIDE_CHROME = """
<style>
  #MainMenu, header, footer, [data-testid="stToolbar"],
  [data-testid="stDecoration"], [data-testid="stStatusWidget"] { display: none !important; }
  .block-container { padding: 0 !important; max-width: 100% !important; }
  [data-testid="stAppViewBlockContainer"] { padding: 0 !important; }
  div[data-testid="stCustomComponentV1"] { height: calc(100vh - 1px) !important; }
  div[data-testid="stCustomComponentV1"] iframe {
    height: calc(100vh - 1px) !important;
    width: 100% !important;
    border: 0 !important;
    display: block;
  }
  body { overflow: hidden; }
</style>
"""
st.markdown(HIDE_CHROME, unsafe_allow_html=True)

if not BUNDLE.exists():
    st.error("App bundle missing — run `python3 scripts/build_singlefile.py` and commit `static/`.")
    st.code("python3 scripts/build_singlefile.py\ngit add static && git commit -m 'build: refresh bundle'", language="bash")
    st.stop()

html = BUNDLE.read_text(encoding="utf-8")
components.html(html, height=900, scrolling=False)
