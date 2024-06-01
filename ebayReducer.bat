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
echo.

if %status%==ONLINE (
echo Status: ONLINE
goto REDUCE
) else (
echo Error: %status%
goto END
)

:REDUCE
echo.
node index.js 5
goto END

:END
echo.
echo Closing...
ping 127.0.0.1 -n 2 > nul
