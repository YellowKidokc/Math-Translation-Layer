@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "NODE_SCRIPT=%ROOT%\scripts\prepare-tts-workflow.js"
if not defined MTL_DEFAULT_ARTICLE set "MTL_DEFAULT_ARTICLE=%ROOT%\tests\fixtures\convergence-01-why-god-drown-everybody.html"
if not defined MTL_TTS_ROOT set "MTL_TTS_ROOT=%ROOT%\tts-pipeline"
set "DEFAULT_ARTICLE=%MTL_DEFAULT_ARTICLE%"
set "DEFAULT_TTS_ROOT=%MTL_TTS_ROOT%"
set "OUT_DIR=%ROOT%\workflow_output"

cd /d "%ROOT%"

echo.
echo ============================================================
echo   MATH TRANSLATION LAYER / TTS INTAKE WIZARD
echo ============================================================
echo   1. Folder or file wizard
echo   2. List file wizard
echo   3. Test the bundled fixture article
echo   4. Scan a file or folder for math only
echo ============================================================
echo.

if not exist "%ROOT%\node_modules" (
    echo Installing Math Translation Layer packages...
    call npm.cmd install
    if errorlevel 1 goto :fail
)

if not exist "%ROOT%\dist\src\core\index.js" (
    echo Building Math Translation Layer...
    call npm.cmd run build
    if errorlevel 1 goto :fail
)

set /p "CHOICE=Pick 1-4 and press Enter: "
echo.

if "%CHOICE%"=="1" goto :wizard_input
if "%CHOICE%"=="2" goto :wizard_list
if "%CHOICE%"=="3" goto :sample
if "%CHOICE%"=="4" goto :scan

echo Unknown choice.
goto :done

:wizard_input
set /p "TARGET=Paste a file or recursive folder path: "
set "INPUT_ARG=--input"
set "INPUT_VALUE=%TARGET%"
goto :wizard_common

:wizard_list
set /p "LIST=Paste the path to a .txt list of files/folders: "
set "INPUT_ARG=--list"
set "INPUT_VALUE=%LIST%"
goto :wizard_common

:wizard_common
call :run_id
call :file_types
call :mode
call :recursive
call :tts_settings

set "EXTRA_ARGS=--copy-source --markdown"
if "%RECURSIVE%"=="N" set "EXTRA_ARGS=%EXTRA_ARGS% --no-recursive"
if "%SKIP_MATH%"=="Y" set "EXTRA_ARGS=%EXTRA_ARGS% --skip-math"

echo.
echo ============================================================
echo   STEP 1: PREPARE COPY + MARKDOWN + TTS TEXT
echo ============================================================
echo   Run ID: %RUN_ID%
echo   Types:  %TYPES%
echo   Mode:   %MODE_LABEL%
echo ============================================================
echo.

node "%NODE_SCRIPT%" %INPUT_ARG% "%INPUT_VALUE%" --out "%OUT_DIR%" --run-id "%RUN_ID%" --types "%TYPES%" %EXTRA_ARGS%
if errorlevel 1 goto :fail

echo.
echo Prepared outputs:
echo   Source copies: %OUT_DIR%\source\%RUN_ID%
echo   Markdown:      %OUT_DIR%\markdown\%RUN_ID%
echo   TTS text:      %OUT_DIR%\prepared\%RUN_ID%
echo   Logs:          %OUT_DIR%\logs\%RUN_ID%
echo.

if "%RUN_TTS%"=="N" goto :maybe_zip

set /p "READY=Review prepared text/markdown. Ready to push to TTS now? Y/N: "
if /i not "%READY%"=="Y" goto :maybe_zip

echo.
echo ============================================================
echo   STEP 2: PUSH PREPARED TEXT TO TTS
echo ============================================================
echo.

node "%NODE_SCRIPT%" --input "%OUT_DIR%\prepared\%RUN_ID%" --out "%OUT_DIR%" --run-id "%RUN_ID%-tts" --types txt --skip-math --run-tts --tts-root "%TTS_ROOT%" --engine "%ENGINE%" --voice "%VOICE%"
if errorlevel 1 goto :fail

echo.
echo Audio:
echo   %OUT_DIR%\audio\%RUN_ID%-tts
echo.

:maybe_zip
set /p "ZIPIT=Zip this run's copied sources, markdown, prepared text, logs, and audio if present? Y/N: "
if /i not "%ZIPIT%"=="Y" goto :done
if not exist "%OUT_DIR%\zips" mkdir "%OUT_DIR%\zips"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$out='%OUT_DIR%'; $run='%RUN_ID%'; $paths=@(\"$out\source\$run\",\"$out\markdown\$run\",\"$out\prepared\$run\",\"$out\logs\$run\",\"$out\audio\$run-tts\",\"$out\logs\$run-tts\") | Where-Object { Test-Path $_ }; if ($paths.Count -gt 0) { Compress-Archive -Path $paths -DestinationPath \"$out\zips\$run.zip\" -Force; Write-Host \"Zip saved: $out\zips\$run.zip\" } else { Write-Host 'Nothing found to zip.' }"
goto :done

:sample
call :run_id
echo Using:
echo %DEFAULT_ARTICLE%
echo.
node "%NODE_SCRIPT%" --input "%DEFAULT_ARTICLE%" --out "%OUT_DIR%" --run-id "%RUN_ID%" --types html --copy-source --markdown
goto :done

:scan
set /p "TARGET=Paste a file or folder path to scan: "
if not exist "%ROOT%\workflow_output\logs" mkdir "%ROOT%\workflow_output\logs"
node "%ROOT%\dist\src\cli\index.js" scan --path "%TARGET%" --renderer tts --report text --output "%ROOT%\workflow_output\logs\math-scan.txt"
echo Scan report saved to:
echo %ROOT%\workflow_output\logs\math-scan.txt
goto :done

:file_types
echo.
echo File types to process:
echo   1. HTML only
echo   2. Markdown only
echo   3. Text only
echo   4. All supported
set /p "TYPE_CHOICE=Pick 1-4: "
set "TYPES=all"
if "%TYPE_CHOICE%"=="1" set "TYPES=html"
if "%TYPE_CHOICE%"=="2" set "TYPES=md"
if "%TYPE_CHOICE%"=="3" set "TYPES=txt"
exit /b 0

:mode
echo.
echo What kind of run?
echo   1. Dry run with Math Translation only, no audio
echo   2. TTS only, skip Math Translation
echo   3. Math Translation, then pause, then TTS
set /p "MODE_CHOICE=Pick 1-3: "
set "RUN_TTS=N"
set "SKIP_MATH=N"
set "MODE_LABEL=Dry run with Math Translation only"
if "%MODE_CHOICE%"=="2" (
    set "RUN_TTS=Y"
    set "SKIP_MATH=Y"
    set "MODE_LABEL=TTS only, skip Math Translation"
)
if "%MODE_CHOICE%"=="3" (
    set "RUN_TTS=Y"
    set "SKIP_MATH=N"
    set "MODE_LABEL=Math Translation, pause, then TTS"
)
exit /b 0

:recursive
set "RECURSIVE=Y"
set /p "RECURSIVE=Recursive folder scan? Y/N [Y]: "
if "%RECURSIVE%"=="" set "RECURSIVE=Y"
exit /b 0

:tts_settings
set "TTS_ROOT=%DEFAULT_TTS_ROOT%"
set "ENGINE=edge"
set "VOICE=en-US-BrianMultilingualNeural"
if "%RUN_TTS%"=="N" exit /b 0
echo.
echo TTS defaults:
echo   Engine: edge
echo   Voice:  en-US-BrianMultilingualNeural
echo   TTS:    %DEFAULT_TTS_ROOT%
echo.
set /p "CUSTOM=Press Enter for defaults, or type C to customize: "
if /i not "%CUSTOM%"=="C" exit /b 0
set /p "TTS_ROOT=TTS pipeline folder: "
set /p "ENGINE=Engine edge or openai: "
set /p "VOICE=Voice name: "
exit /b 0

:run_id
for /f %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_ID=%%I"
exit /b 0

:fail
echo.
echo Something failed while setting up or running the workflow.
goto :done

:done
echo.
echo Done. Outputs and logs are under:
echo %OUT_DIR%
echo.
pause
