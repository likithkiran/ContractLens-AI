@echo off
title ContractLens AI — Live Server
cd /d "%~dp0"
echo ============================================================
echo   ContractLens AI — Understand Before You Sign
echo   Starting server at http://127.0.0.1:3000 ...
echo ============================================================
echo.
start "" "http://127.0.0.1:3000"
node backend\server.js
pause
