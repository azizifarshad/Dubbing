import os
import sys
import subprocess
import markdown

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

@page {{
    size: A4;
    margin: 18mm 15mm 18mm 15mm;
}}

body {{
    font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif;
    direction: rtl;
    text-align: right;
    color: #1e293b;
    line-height: 1.8;
    font-size: 10pt;
    background-color: #ffffff;
}}

h1, h2, h3, h4, h5, h6 {{
    color: #0f172a;
    font-weight: 700;
    page-break-after: avoid;
}}

h1 {{
    font-size: 20pt;
    color: #065f46;
    border-bottom: 2.5px solid #099767;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 18px;
}}

h2 {{
    font-size: 14pt;
    color: #047857;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 24px;
    margin-bottom: 14px;
}}

h3 {{
    font-size: 12pt;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 10px;
}}

p {{
    margin: 8px 0;
}}

table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9pt;
    page-break-inside: avoid;
}}

th, td {{
    border: 1px solid #cbd5e1;
    padding: 7px 10px;
    text-align: right;
}}

th {{
    background-color: #099767;
    color: #ffffff;
    font-weight: 600;
}}

tr:nth-child(even) {{
    background-color: #f8fafc;
}}

code {{
    direction: ltr;
    display: inline-block;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8.5pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
}}

pre {{
    direction: ltr;
    text-align: left;
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8.5pt;
    line-height: 1.5;
    page-break-inside: avoid;
    margin: 12px 0;
}}

pre code {{
    background: none;
    color: inherit;
    padding: 0;
    border: none;
}}

blockquote {{
    border-right: 4px solid #099767;
    border-left: none;
    background-color: #f0fdf4;
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 4px;
    color: #166534;
    page-break-inside: avoid;
}}

hr {{
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 20px 0;
}}

.badge {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 8pt;
    font-weight: 600;
}}

.badge-green {{ background: #dcfce7; color: #166534; }}
.badge-red {{ background: #fee2e2; color: #991b1b; }}
.badge-blue {{ background: #e0f2fe; color: #075985; }}

ul, ol {{
    padding-right: 20px;
    margin: 8px 0;
}}

li {{
    margin: 4px 0;
}}
</style>
</head>
<body>
{body}
</body>
</html>'''

def md_to_pdf(md_path, pdf_path, title="مستند ممیزی ویدانس"):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    html_body = markdown.markdown(
        md_text,
        extensions=['tables', 'fenced_code', 'nl2br', 'sane_lists']
    )

    full_html = HTML_TEMPLATE.format(title=title, body=html_body)
    html_path = md_path.replace(".md", ".html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    out_pdf = os.path.abspath(pdf_path)
    in_html = os.path.abspath(html_path)
    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={out_pdf}",
        in_html
    ]
    subprocess.run(cmd, check=True)
    if os.path.exists(html_path):
        os.remove(html_path)
    print(f"Created: {out_pdf} ({os.path.getsize(out_pdf)} bytes)")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        title = sys.argv[3] if len(sys.argv) > 3 else "مستند ممیزی ویدانس"
        md_to_pdf(sys.argv[1], sys.argv[2], title)
