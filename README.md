# DaveMD — Markdown Editor + Docs Engine

Editor web de Markdown + publicación como sitio estático con VitePress.

## Arquitectura

```
Browser
  ├── :5173  → Editor (Vite + React + Monaco)  → POST/GET → FastAPI :8000 → /docs/*.md
  └── :5174  → VitePress (lee /docs/*.md y lo renderiza)
```

## Inicio rápido

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Editor (Vite + React)

```bash
cd editor
npm install
npm run dev
# http://localhost:5173
```

### 3. Sitio VitePress (opcional)

```bash
cd site
npm install
npm run dev
# http://localhost:5174
```

## Estructura

```
davemd/
├── docs/          ← Archivos .md (fuente de verdad compartida)
├── backend/       ← FastAPI: /list, /read, /save
├── editor/        ← Vite + React + Monaco Editor
└── site/          ← VitePress (lee /docs y genera sitio estático)
```

## Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/list` | Lista todos los archivos .md |
| GET | `/read?filename=x.md` | Lee el contenido de un archivo |
| POST | `/save` | Guarda `{filename, content}` |
