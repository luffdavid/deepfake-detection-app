@echo off
title Windows-Oberflaeche wiederherstellen

taskkill /F /IM explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul

start "" "%WINDIR%\explorer.exe"

timeout /t 5 /nobreak >nul
exit