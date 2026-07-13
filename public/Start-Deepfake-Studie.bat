@echo off
title Deepfake Detection LMU

REM Bereits geöffnetes Edge schließen
taskkill /F /IM msedge.exe >nul 2>&1

REM Kurz warten
timeout /t 2 /nobreak >nul

REM Edge-Pfad prüfen und im Kioskmodus starten
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
    --kiosk "https://deepfake-detection-lmu.vercel.app/" ^
    --edge-kiosk-type=fullscreen ^
    --no-first-run ^
    --kiosk-idle-timeout-minutes=0
    exit
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" ^
    --kiosk "https://deepfake-detection-lmu.vercel.app/" ^
    --edge-kiosk-type=fullscreen ^
    --no-first-run ^
    --kiosk-idle-timeout-minutes=0
    exit
)

echo Microsoft Edge wurde nicht gefunden.
pause