@echo off
title DevSwarm Launcher
echo ===================================================
echo             Starting DevSwarm...
echo ===================================================
echo.

echo [1/2] Launching Backend Server on port 3001...
start "DevSwarm Backend" cmd /k "cd backend && npm start"

echo [2/2] Launching Frontend (Vite) Dev Server on port 5173...
start "DevSwarm Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo  DevSwarm is now running!
echo  - Backend: http://localhost:3001
echo  - Frontend: http://localhost:5173
echo.
echo  Press any key to close this launcher window...
echo ===================================================
pause > nul
