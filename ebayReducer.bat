@echo off

:MENU
cls
echo Loading...
cd "%~dp0"
node "index.js" 0 >> statusTmp

cls
set /p status= < statusTmp
del statusTmp
cls
echo ...............................................
echo EBay Reducer 1.0
echo ...............................................

if %status%==ONLINE (
echo Status: ONLINE
goto REDUCE
) else (
echo Error: %status%
goto END
)

:REDUCE
set loopCount=1
set loopCountMax=5

:LOOP
echo ---------------------------------------
echo Attempt %loopCount% of %loopCountMax%
echo ---------------------------------------
node index.js 5

For /F "UseBackQ Delims==" %%A In (`node index.js 7`) Do Set "reductionStatus=%%A"
echo %reductionStatus%
set /a loopCount=loopCount+1
if %reductionStatus%=="SUCCESS" goto END
if %loopcount% EQU %loopCountMax% goto END

:END
echo.
echo Closing...
pause
@REM ping 127.0.0.1 -n 2 > nul
