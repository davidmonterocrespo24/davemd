@echo off
echo Iniciando DaveMD...

:: Backend (FastAPI)
start "DaveMD - Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000"

:: Editor (Vite + React)
start "DaveMD - Editor" cmd /k "cd /d %~dp0editor && npm install --silent && npm run dev"

:: VitePress
start "DaveMD - VitePress" cmd /k "cd /d %~dp0site && npm install --silent && npm run dev"

echo.
echo Abriendo en el navegador en 5 segundos...
timeout /t 5 /nobreak >nul
start http://localhost:5173
