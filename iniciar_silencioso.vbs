Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & "d:\PROGRAMAS\DEATurnos\iniciar_sistema.bat" & """", 0, False
WScript.Sleep 2500
WshShell.Run "http://localhost:5000"