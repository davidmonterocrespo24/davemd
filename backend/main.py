from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = FastAPI(title="DaveMD API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCS_PATH = Path(os.getenv("DOCS_PATH", "../docs")).resolve()
DOCS_PATH.mkdir(parents=True, exist_ok=True)

CONFIG_PATH = Path(__file__).parent.parent / "editor.config.json"

DEFAULT_CONFIG = {
    "theme": "vs-dark",
    "fontSize": "14px",
    "lineNumbers": True,
    "lineWrapping": True,
    "tabSize": 4,
    "indentUnit": 4,
    "readOnly": False,
    "autoCloseBrackets": True,
    "matchBrackets": True,
    "styleActiveLine": True,
    "autoFocus": True,
    "placeholder": "Enjoy Markdown! coding now...",
    "watch": True,
    "toolbar": True,
    "syncScrolling": True,
    "codeFold": False,
    "showTrailingSpace": True,
    "matchWordHighlight": True,
    "indentWithTabs": True,
    "searchReplace": True,
    "autoHeight": False,
    "saveHTMLToTextarea": False,
}


class SaveRequest(BaseModel):
    filename: str
    content: str


class ConfigRequest(BaseModel):
    config: dict


@app.get("/config")
def get_config():
    if not CONFIG_PATH.exists():
        return DEFAULT_CONFIG
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="editor.config.json contiene JSON inválido")


@app.post("/config")
def save_config(body: ConfigRequest):
    CONFIG_PATH.write_text(
        json.dumps(body.config, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return {"saved": True}


@app.get("/list")
def list_docs():
    files = sorted(f.name for f in DOCS_PATH.rglob("*.md"))
    return {"files": files}


@app.get("/read")
def read_doc(filename: str):
    path = DOCS_PATH / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return {"filename": filename, "content": path.read_text(encoding="utf-8")}


@app.post("/save")
def save_doc(body: SaveRequest):
    # Prevenir path traversal
    normalized = Path(body.filename).as_posix()
    if ".." in normalized or normalized.startswith("/"):
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    if not normalized.endswith(".md"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .md")

    path = DOCS_PATH / normalized
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body.content, encoding="utf-8", newline="\n")
    return {"saved": normalized}
