"""Render the four MUSA 5500 notebooks to static HTML pages for the website, as they were run (no re-run).

Run from the repo root (geospatial env, which has nbconvert):
    python web/render_notebooks.py

Reads notebooks/0*.ipynb and writes web/public/notebooks/<name>.html with nbconvert's lab
template, the same as `jupyter nbconvert --to html`, plus a Copy button on every code cell. Comments in the template's
own style sheets and scripts are dropped to keep the pages small. The outputs stay exactly as saved in each notebook.
"""

import re
from pathlib import Path

import nbformat
from nbconvert import HTMLExporter

HERE = Path(__file__).resolve().parent
NOTEBOOKS = HERE.parent / "notebooks"
OUT = HERE / "public" / "notebooks"

STYLE = re.compile(r"(<style[^>]*>)(.*?)(</style>)", re.S)
SCRIPT = re.compile(r"(<script[^>]*>)(.*?)(</script>)", re.S)
CSS_COMMENT = re.compile(r"/\*.*?\*/", re.S)
# Only whole-line doc comments (a line that starts with /**), so nothing inside a string is touched.
JS_DOC_COMMENT = re.compile(r"^[ \t]*/\*\*.*?\*/[ \t]*\n", re.S | re.M)


def strip_comments(html: str) -> str:
    """Drop comments in the template's <style> blocks and doc comments in its <script> blocks."""
    html = STYLE.sub(lambda m: m.group(1) + CSS_COMMENT.sub("", m.group(2)) + m.group(3), html)
    return SCRIPT.sub(lambda m: m.group(1) + JS_DOC_COMMENT.sub("", m.group(2)) + m.group(3), html)


# A Copy button in the top right corner of every code cell. It copies the cell's code as plain text.
COPY = """<style>
.jp-InputArea-editor { position: relative; }
.nb-copy { position: absolute; top: 6px; right: 6px; z-index: 2; padding: 2px 8px; font: 600 11px/1.6 system-ui, sans-serif;
  color: #334155; background: #fff; border: 1px solid #d6d3d1; border-radius: 4px; cursor: pointer; opacity: 0.55; }
.jp-InputArea-editor:hover .nb-copy, .nb-copy:focus-visible { opacity: 1; }
.nb-copy:hover { background: #f5f5f4; }
.nb-copy.done { color: #14532d; border-color: #86efac; opacity: 1; }
</style>
<script>
document.querySelectorAll('.jp-CodeCell .jp-InputArea-editor').forEach(function (ed) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'nb-copy'; b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy this code');
  b.addEventListener('click', function () {
    var pre = ed.querySelector('pre'); var code = (pre ? pre.innerText : ed.innerText).trimEnd();
    var ok = function () { b.textContent = 'Copied'; b.classList.add('done');
      setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('done'); }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, fallback); else fallback();
    function fallback() { var t = document.createElement('textarea'); t.value = code; document.body.appendChild(t);
      t.select(); try { document.execCommand('copy'); ok(); } finally { t.remove(); } }
  });
  ed.appendChild(b);
});
</script>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    exporter = HTMLExporter(template_name="lab")
    for nb_path in sorted(NOTEBOOKS.glob("0*.ipynb")):
        nb = nbformat.read(nb_path, as_version=4)
        html, _ = exporter.from_notebook_node(nb, resources={"metadata": {"name": nb_path.stem}})
        out = OUT / f"{nb_path.stem}.html"
        html = strip_comments(html).replace("</body>", COPY + "</body>", 1)
        out.write_text(html, encoding="utf-8")
        print(f"  wrote {out.relative_to(HERE.parent.parent)} ({out.stat().st_size / 1e3:.0f} KB)")


if __name__ == "__main__":
    main()
