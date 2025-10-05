@echo off
start cmd /k python backend.py
python -m http.server 5500
pause
