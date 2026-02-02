@echo off
setlocal
set MOLTSOC_ROOT=%~dp0
node "%MOLTSOC_ROOT%cli\index.js" %*
exit /b %ERRORLEVEL%
