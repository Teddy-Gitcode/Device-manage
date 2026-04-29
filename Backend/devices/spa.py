"""
SPA fallback view — serves the built React/Vite bundle from frontend/dist/.

During development, the Vite dev server runs on :5173 and proxies API calls
to Django on :8000 — so Django never serves the SPA in dev. In production,
`npm run build` writes into frontend/dist/, and this view returns index.html
for any non-/api/ URL so client-side routing works.
"""
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseNotFound
from django.views.decorators.cache import never_cache

SPA_DIST = Path(settings.BASE_DIR).parent / "frontend" / "dist"
INDEX_FILE = SPA_DIST / "index.html"


@never_cache
def spa_view(_request, _resource_path: str = ""):
    if not INDEX_FILE.exists():
        return HttpResponseNotFound(
            "Frontend bundle not found. Run `npm run build` in ./frontend first."
        )
    return FileResponse(open(INDEX_FILE, "rb"), content_type="text/html")


def spa_asset(_request, path: str):
    file_path = (SPA_DIST / "assets" / path).resolve()
    try:
        file_path.relative_to(SPA_DIST.resolve())
    except ValueError:
        raise Http404()
    if not file_path.is_file():
        raise Http404()
    return FileResponse(open(file_path, "rb"))
