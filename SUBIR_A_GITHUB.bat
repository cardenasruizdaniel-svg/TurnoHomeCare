@echo off
chcp 65001 >nul
title Subiendo DEATurnos a GitHub - HomeCare del Quindío
color 0B

echo ================================================================
echo       SUBIENDO PROYECTO A GITHUB: TurnoHomeCare
echo ================================================================
echo.

cd "%~dp0"

echo [1/3] Configurando rama principal (main)...
git branch -M main

echo [2/3] Vinculando con el repositorio remoto de GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/Cardenasruizdaniel-SVG/TurnoHomeCare.git

echo [3/3] Subiendo código a GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ================================================================
    echo   ¡CÓDIGO SUBIDO A GITHUB EXITOSAMENTE!
    echo ================================================================
    echo.
    echo Tu repositorio ya está en línea:
    echo 👉 https://github.com/Cardenasruizdaniel-SVG/TurnoHomeCare
    echo.
    echo Siguiente paso: Ir a Render.com y conectar este repositorio.
) else (
    color 0C
    echo.
    echo [AVISO] Si te solicita credenciales de GitHub, ingresa tu usuario y token/contraseña.
)

pause
