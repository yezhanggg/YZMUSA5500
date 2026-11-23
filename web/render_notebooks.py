"""Render the four MUSA 5500 notebooks to static HTML pages for the website, as they were run (no re-run).

Run from the repo root (geospatial env, which has nbconvert):
    python web/render_notebooks.py

Reads notebooks/0*.ipynb and writes web/public/notebooks/<name>.html with nbconvert's lab
template, the same as `jupyter nbconvert --to html`. Comments in the template's own style sheets and scripts are
dropped to keep the pages small. The outputs stay exactly as saved in each notebook.
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


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    exporter = HTMLExporter(template_name="lab")
    for nb_path in sorted(NOTEBOOKS.glob("0*.ipynb")):
        nb = nbformat.read(nb_path, as_version=4)
        html, _ = exporter.from_notebook_node(nb, resources={"metadata": {"name": nb_path.stem}})
        out = OUT / f"{nb_path.stem}.html"
        out.write_text(strip_comments(html), encoding="utf-8")
        print(f"  wrote {out.relative_to(HERE.parent.parent)} ({out.stat().st_size / 1e3:.0f} KB)")


if __name__ == "__main__":
    main()
