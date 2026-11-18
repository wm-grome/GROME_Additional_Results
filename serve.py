"""Serve the local demo page with HTTP byte ranges for video seeking."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re


class VideoHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            return super().send_head()
        try:
            source = path.open("rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        size = path.stat().st_size
        start, end = 0, size - 1
        header = self.headers.get("Range")
        if header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
            if match and any(match.groups()) and size:
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    start = max(0, size - int(last))
                if start <= end and start < size:
                    self.byte_range = (start, end)
            if self.byte_range is None:
                source.close()
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
        self.send_response(206 if self.byte_range else 200)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Last-Modified", self.date_time_string(path.stat().st_mtime))
        self.send_header("Cache-Control", "no-cache")
        if self.byte_range:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        source.seek(start)
        return source

    def copyfile(self, source, outputfile):
        remaining = self.byte_range[1] - self.byte_range[0] + 1 if self.byte_range else None
        try:
            while remaining is None or remaining > 0:
                chunk = source.read(min(256 * 1024, remaining) if remaining is not None else 256 * 1024)
                if not chunk:
                    break
                outputfile.write(chunk)
                if remaining is not None:
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    options = parser.parse_args()
    directory = Path(__file__).resolve().parent
    server = ThreadingHTTPServer((options.bind, options.port), partial(VideoHandler, directory=str(directory)))
    print(f"GROME supplementary page: http://{options.bind}:{options.port}/", flush=True)
    server.serve_forever()
