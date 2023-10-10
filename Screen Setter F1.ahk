#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.


jsList := [8080, 8081, 8082, 8083, 1557, 1224, 49415, 3939, 1004, 1111, 2250, 1128, 5599, 4010, 1337, 8079, "'8078 neural'", "'9000 RTMP Server'"]

; 8080 메인채널
; 8081 메인채널2
; 8082 메인채널3
; 8083 메인채널4
; 1557 공용채널
; 1224 개발용 채널
; 49415 개인채널 : 두림
; 3939 개인채널 : 모카번
; 1004 개인채널 : 디아
; 1111 개인채널 : 다정이
; 2250 개인채널 : 김네모
; 1128 개인채널 : 코코로
; 5599 개인채널 : 에양
; 4010 개인채널 : pagolas
; 1337 공용채널
; 8079 컨트롤타워
; 9000 RTMP Server

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
    send, sudo -E ./run.sh %e%
    send, {enter}
    sleep, 100

    if(i < jsList.Count())
    {
        send, ^ac
        sleep, 200
    }        
}
exitapp

insert::reload