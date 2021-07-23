#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.


jsList := [8080, 8081, 8082, 1557, 1224, 49415]

f1::
for i, e in jsList
{
    send, ^a+a
    sleep, 100
    send, {Backspace}{Backspace}{Backspace}{Backspace}%e%{enter}
    sleep, 100
    send, cd /var/www/html
    send, {enter}
    sleep, 100
    send, ./run.sh %e%
    send, {enter}
    sleep, 100

    if(i < jsList.Count())
    {
        send, ^ac
        sleep, 200
    }        
}

insert::reload