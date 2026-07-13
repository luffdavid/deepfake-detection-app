@echo off

taskkill /F /IM explorer.exe >nul 2>&1

start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
 --kiosk "https://deepfake-detection-lmu.vercel.app/" ^
 --edge-kiosk-type=fullscreen

echo.
echo Druecke eine Taste um den Kiosk zu beenden...
pause >nul

taskkill /F /IM msedge.exe >nul 2>&1

start explorer.exe