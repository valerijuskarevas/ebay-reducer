@echo off

echo Administrative permissions required. Detecting permissions...
net session >nul 2>&1
if %errorLevel% == 0 (
  echo Success: Administrative permissions confirmed.
  GOTO MENU
) else (
  echo Failure: Run the application as administrator!.
  GOTO END
)

:MENU

::Check if task is running
set taskStatus=0
for /F "usebackq tokens=2,*" %%f in (`schtasks /query /TN "EbayReducer" /FO LIST ^| findstr Status`) do set taskStatus=%%f %%g

cls
echo EBay Reducer 1.0 Start...
echo.

::Check if dependencies installed
echo Loading dependencies...
if not exist node_modules\ (
  call npm install
)
echo Checking authorization keys...
node index.js 0 >> statusTmp
cls
set /p status= < statusTmp 
del statusTmp
cls
echo ...............................................
echo EBay Reducer 1.0 Configurations
echo ...............................................
echo.

if %status%==ONLINE (echo Status: ONLINE) else (echo Error: %status%)

if %taskStatus%==Ready (
  echo Task: RUNNING
) else (
  if %taskStatus%==Running (
    echo Task: RUNNING
  ) else (
    echo Task: INACTIVE
    )
)



SET M=""
echo.
echo 1 - Configure authorization
if %status%==ONLINE echo 2 - Configure interval and discount
if %status%==ONLINE echo 3 - Show items
if %taskStatus%==Ready (
  echo 4 - Deactivate running task
) else (
  echo 4 - Activate running task
)
echo 5 - Error Log
echo 6 - Reduction Log
echo 7 - Exit
echo.

SET /P M=Select menu item and press ENTER: 
IF %M%=="" GOTO MENU
IF %M%==1 GOTO AUTH
IF %M%==2 GOTO INTERVAL
IF %M%==3 GOTO ITEMS
IF %M%==4 GOTO TASK
IF %M%==5 GOTO LOGS
IF %M%==6 GOTO REDUCTION_LOG
IF %M%==7 GOTO END

:AUTH
cls
set /p clientId=Enter Client ID : 
set /p clientSecret=Enter Client Secret : 
set /p redirectUri=Enter Redirect URI : 
node index.js 1 %clientId% %clientSecret% %redirectUri%  >> urlTmp 
set /p url= < urlTmp 
echo %url%
start %url%
del urlTmp
set /p code=Enter "code" query : 
node index.js 4 %code%
pause
GOTO MENU

:INTERVAL
cls
set /p interval=Enter interval every N days at 12.00 : 
if %interval% GTR 200 GOTO INTERVAL
if %interval% LEQ 0 GOTO INTERVAL
:DISCOUNT
set /p discount=Enter discount (0.00 - 1.00) : 
if %discount% GTR 1 GOTO DISCOUNT
if %discount% LEQ 0 GOTO DISCOUNT
node index.js 2 %interval% %discount%

node index.js 8
schtasks /create /xml "EbayReducerDaily.xml" /tn "EbayReducer"

pause
GOTO MENU

:ITEMS
cls
node index.js 3
pause
GOTO MENU

:REDUCTION_LOG
if exist logs\reductionLog.txt (
  start logs\reductionLog.txt
) else (
  echo No logs!
  pause
)
GOTO MENU

:LOGS
if exist logs\errorLog.txt (
  start logs\errorLog.txt
) else (
  echo No errors!
  pause
)
GOTO MENU

:TASK
cls
node index.js 6 >> intervalTmp
set /p interval= < intervalTmp 
del intervalTmp
if %taskStatus%==0 (
  node index.js 8
  schtasks /create /xml "EbayReducerDaily.xml" /tn "EbayReducer"
) else (
  schtasks /delete /tn "EbayReducer" /f
)
ping 127.0.0.1 -n 3 > nul
GOTO MENU

:END
echo Closing...
ping 127.0.0.1 -n 2 > nul
