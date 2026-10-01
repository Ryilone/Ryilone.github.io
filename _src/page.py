"""Wraps each project page body in the shared head, top bar and footer.
Usage: python3 _src/page.py  (reads _src/pages/*.html, writes work/*.html)"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
head = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · Turki Alzaid</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="https://ryilone.github.io/work/{slug}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{title} · Turki Alzaid">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="https://ryilone.github.io/assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#F6F3EE" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#101318" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="home" href="../">Turki Alzaid</a>
      <nav aria-label="Main">
        <a href="../#projects">Projects</a>
        <a href="../assets/Turki-Alzaid-Resume.pdf">Resume</a>
        <a href="https://github.com/Ryilone">GitHub</a>
      </nav>
    </header>
    <main class="prose">
"""
foot = """    </main>
    <footer>
      <p><a href="mailto:talzaid@lion.lmu.edu">talzaid@lion.lmu.edu</a> · <a href="https://github.com/Ryilone">GitHub</a> · <a href="../assets/Turki-Alzaid-Resume.pdf">Resume</a></p>
    </footer>
  </div>
</body>
</html>
"""
for src in sorted((root / "_src/pages").glob("*.html")):
    text = src.read_text()
    meta = dict(re.findall(r"^<!-- (\w+): (.*?) -->$", text, re.M))
    body = re.sub(r"^<!-- \w+: .*? -->\n", "", text, flags=re.M)
    scripts = "".join('  <script src="../js/%s.js" defer></script>\n' % n.strip()
                      for n in meta.pop("scripts", "").split(",") if n.strip())
    out = root / "work" / src.name
    out.write_text(head.format(slug=src.stem, **meta) + body + foot.replace("</body>", scripts + "</body>"))
    print("wrote", out.relative_to(root))
