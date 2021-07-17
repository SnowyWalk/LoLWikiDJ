#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.


srcFile := "8080.js"
destFiles := ["8081.js", "8082.js", "1557.js", "1224.js", "49415.js"]
keepLines := 3

FileRead, srcStr, % "*P65001 " srcFile

StringGetPos, startOffset, srcStr, `n, L%keepLines%
StringTrimLeft, srcStr, srcStr, % startOffset

for i, e in destFiles
    FileRead, destStr, % "*P65001 " e
    StringGetPos, keepCount, destStr, `n, L%keepLines%
    destStr := SubStr(destStr, 1, keepCount) srcStr
    FileDelete, % e
    FileAppend, % destStr, % e, UTF-8-RAW

