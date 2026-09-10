@echo off
setlocal
set "PATH=C:\Users\chris\AppData\Local\trunk\tools\node\22.16.0-12da8a4c27b144aedaf7d975e067667c;%PATH%"
cd /d "%~dp0"
call .\node_modules\.bin\electron.cmd .
endlocal
