# -*- coding: utf-8 -*-
"""
Pruebas automáticas del Generador de Reportes Académicos.

Abre la app en Chrome sin interfaz, le inyecta cada prueba de tests/casos/ y
lee los resultados (líneas PASS / FAIL de un <pre id="TEST_RESULTS">).
Solo necesita Python 3 y Google Chrome (o Chromium); no usa paquetes extra.

Uso:
    python tests/ejecutar.py                 # todas las pruebas
    python tests/ejecutar.py nucleo formato  # solo algunas
    python tests/ejecutar.py --lista         # ver las pruebas disponibles

Chrome se busca solo; si no lo encuentra, indica la ruta con la variable de
entorno CHROME.
"""
import base64
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import http.server
from urllib.parse import urlparse, parse_qs

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS_DIR)
CASES_DIR = os.path.join(TESTS_DIR, 'casos')

# modo 'archivo': se abre con file:// y tiempo virtual (rápido).
# modo 'http': se sirve por http y en tiempo real (IndexedDB y service worker
#   no funcionan con el tiempo virtual de Chrome).
TESTS = {
    'nucleo':             {'modo': 'archivo'},
    'perfil':             {'modo': 'archivo'},
    'respaldo':           {'modo': 'archivo', 'tiempo': 60000},
    'herramientas':       {'modo': 'archivo'},
    'parrafos':           {'modo': 'archivo'},
    'formato':            {'modo': 'archivo'},
    'revision':           {'modo': 'archivo'},
    'codigo':             {'modo': 'archivo', 'tiempo': 40000},
    'imagenes':           {'modo': 'archivo'},
    'diseno_computadora': {'modo': 'archivo'},
    'diseno_celular':     {'modo': 'archivo', 'ventana': '390,844'},
    'barra_celular':      {'modo': 'archivo', 'ventana': '390,844'},
    'word':               {'modo': 'archivo', 'tiempo': 60000, 'word': True},
    'documentos':         {'modo': 'http'},
    'pwa':                {'modo': 'http'},
}

APP_FILES = ['index.html', 'manifest.json', 'sw.js', 'terminos.html', 'privacidad.html']
APP_DIRS = ['CSS', 'JS', 'ASSETS']


def find_chrome():
    if os.environ.get('CHROME'):
        return os.environ['CHROME']
    candidates = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    for name in ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']:
        found = shutil.which(name)
        if found:
            return found
    sys.exit('No se encontró Chrome. Indica la ruta con la variable de entorno CHROME.')


def read_case(name):
    with open(os.path.join(CASES_DIR, name + '.html'), encoding='utf-8') as f:
        return f.read()


def results_from_dom(dom):
    m = re.search(r'<pre id="TEST_RESULTS"[^>]*>(.*?)</pre>', dom, re.S)
    return html.unescape(m.group(1)) if m else None


def short_profile():
    # Ruta corta: con rutas muy largas la caché de Chrome falla
    return tempfile.mkdtemp(prefix='gr-')


# ---------------------------------------------------------------------------
# Modo archivo
# ---------------------------------------------------------------------------
def run_file_test(chrome, name, cfg, work):
    root_url = 'file:///' + ROOT.replace('\\', '/').lstrip('/')
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        page = f.read()
    for attr, folder in [('href', 'CSS'), ('src', 'JS'), ('src', 'ASSETS'), ('href', 'ASSETS')]:
        page = page.replace(f'{attr}="{folder}/', f'{attr}="{root_url}/{folder}/')
    page = page.replace('</body>', read_case(name) + '</body>')
    path = os.path.join(work, name + '.html')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    profile = short_profile()
    try:
        proc = subprocess.run([
            chrome, '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run',
            f'--user-data-dir={profile}', f'--window-size={cfg.get("ventana", "1440,900")}',
            f'--virtual-time-budget={cfg.get("tiempo", 25000)}', '--dump-dom',
            'file:///' + path.replace('\\', '/').lstrip('/')
        ], capture_output=True, timeout=300)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return proc.stdout.decode('utf-8', 'replace')


# ---------------------------------------------------------------------------
# Modo http (tiempo real)
# La página incluye <img src="/__hold?id=...">: el servidor no la responde
# hasta que la prueba termina, así el evento "load" (y el --dump-dom de
# Chrome) esperan a la prueba.
# ---------------------------------------------------------------------------
class HoldServer:
    def __init__(self, directory):
        self.events = {}
        self.lock = threading.Lock()
        server = self

        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=directory, **kw)

            def do_GET(self):
                url = urlparse(self.path)
                key = parse_qs(url.query).get('id', [''])[0]
                if url.path == '/__hold':
                    server.event(key).wait(150)
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/gif')
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.wfile.write(base64.b64decode('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='))
                    return
                if url.path == '/__done':
                    server.event(key).set()
                    self.send_response(204)
                    self.end_headers()
                    return
                super().do_GET()

            def log_message(self, *a):
                pass

        class QuietServer(http.server.ThreadingHTTPServer):
            daemon_threads = True

            def handle_error(self, request, client_address):
                pass  # Chrome corta conexiones al cerrar: no es un error de la prueba

        self.httpd = QuietServer(('127.0.0.1', 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def event(self, key):
        with self.lock:
            return self.events.setdefault(key, threading.Event())

    def close(self):
        self.httpd.shutdown()


def run_http_test(chrome, name, cfg, server, site):
    key = f'{name}-{int(time.time() * 1000)}'
    with open(os.path.join(site, 'index.html'), encoding='utf-8') as f:
        page = f.read()
    case = read_case(name).replace("window.addEventListener('load', () => setTimeout(",
                                   "document.addEventListener('DOMContentLoaded', () => setTimeout(")
    done = ('<script>new MutationObserver((m, o) => { if (document.getElementById("TEST_RESULTS")) '
            '{ o.disconnect(); fetch("/__done?id=' + key + '"); } }).observe(document.documentElement, '
            '{ childList: true, subtree: true });</script>')
    hold = f'<img src="/__hold?id={key}" alt="" style="display:none">'
    with open(os.path.join(site, f'prueba_{name}.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(page.replace('</body>', case + done + hold + '</body>'))
    profile = short_profile()
    try:
        proc = subprocess.run([
            chrome, '--headless=new', '--disable-gpu', '--no-first-run', f'--user-data-dir={profile}',
            f'--window-size={cfg.get("ventana", "1440,900")}', '--timeout=160000', '--dump-dom',
            f'http://127.0.0.1:{server.port}/prueba_{name}.html'
        ], capture_output=True, timeout=300)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return proc.stdout.decode('utf-8', 'replace')


def make_site(work):
    site = os.path.join(work, 'sitio')
    os.makedirs(site, exist_ok=True)
    for d in APP_DIRS:
        shutil.copytree(os.path.join(ROOT, d), os.path.join(site, d), dirs_exist_ok=True)
    for f in APP_FILES:
        shutil.copy(os.path.join(ROOT, f), site)
    return site


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--lista' in sys.argv:
        print('\n'.join(TESTS))
        return 0
    unknown = [a for a in args if a not in TESTS]
    if unknown:
        sys.exit('Pruebas desconocidas: ' + ', '.join(unknown) + '\nDisponibles: ' + ', '.join(TESTS))
    names = args or list(TESTS)
    chrome = find_chrome()
    work = tempfile.mkdtemp(prefix='gr-pruebas-')
    server = None
    site = None
    total_pass = total_fail = 0
    failed_tests = []
    start = time.time()
    try:
        for name in names:
            cfg = TESTS[name]
            if cfg['modo'] == 'http':
                if not server:
                    site = make_site(work)
                    server = HoldServer(site)
                dom = run_http_test(chrome, name, cfg, server, site)
            else:
                dom = run_file_test(chrome, name, cfg, work)
            results = results_from_dom(dom)
            if results is None:
                print(f'✗ {name}: sin resultados (la prueba no terminó)')
                failed_tests.append(name)
                total_fail += 1
                continue
            lines = results.splitlines()
            passed = sum(1 for l in lines if l.startswith('PASS'))
            failed = [l for l in lines if l.startswith('FAIL') or l.startswith('ERROR')]
            if cfg.get('word'):
                from revisar_word import check_docx_files
                files = re.search(r'<pre id="DOCX_FILES"[^>]*>(.*?)</pre>', dom, re.S)
                extra_pass, extra_fail = check_docx_files(json.loads(html.unescape(files.group(1))) if files else {}, work)
                passed += extra_pass
                failed += extra_fail
            total_pass += passed
            total_fail += len(failed)
            mark = '✓' if not failed else '✗'
            print(f'{mark} {name}: {passed} bien, {len(failed)} mal')
            for line in failed:
                print('    ' + line)
            if failed:
                failed_tests.append(name)
    finally:
        if server:
            server.close()
        shutil.rmtree(work, ignore_errors=True)

    print(f'\nTotal: {total_pass} bien, {total_fail} mal ({time.time() - start:.0f} s)')
    if failed_tests:
        print('Con fallas: ' + ', '.join(failed_tests))
        return 1
    return 0


if __name__ == '__main__':
    sys.path.insert(0, TESTS_DIR)
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    sys.exit(main())
