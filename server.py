#!/usr/bin/env python3
"""
Локальный сервер для портфолио-сайта.
Обслуживает статику + предоставляет API для чтения/записи data/content.json
"""
import json, os, sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'content.json')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/content':
            self._serve_json()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/content':
            self._save_json()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _serve_json(self):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except Exception as e:
            self.send_error(500, str(e))

    def _save_json(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            parsed = json.loads(body)  # validate JSON
            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
        except Exception as e:
            self.send_error(400, str(e))

    def log_message(self, fmt, *args):
        print(f'  {self.address_string()} [{self.log_date_time_string()}] {fmt % args}')

if __name__ == '__main__':
    os.chdir(BASE_DIR)
    server = HTTPServer(('', PORT), Handler)
    print(f'\n  [*] Portfolio Server running')
    print(f'  [*] Site:   http://localhost:{PORT}')
    print(f'  [*] Admin:  http://localhost:{PORT}/admin.html')
    print(f'  [*] API:    http://localhost:{PORT}/api/content')
    print(f'  [*] Press Ctrl+C to stop\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
        sys.exit(0)
