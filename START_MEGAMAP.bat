@echo off
setlocal
cd /d "%~dp0"
for %%F in (index.html src\app.js src\engine.js src\assets.js src\editor-core.js src\render.js src\style.css src\i18n.js) do (
 if not exist "%%F" (
  echo Megamap: missing %%F
  echo Extract the WHOLE ZIP first. Keep the src and assets folders beside index.html.
  pause
  exit /b 1
 )
)
start "" "%~dp0index.html"
endlocal
