@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node is needed for developer tests only. It is NOT required to run Megamap.
 pause
 exit /b 1
)
node --test tests/engine.test.cjs tests/v1.test.cjs tests/v12.test.cjs
set "RESULT=%ERRORLEVEL%"
pause
exit /b %RESULT%
