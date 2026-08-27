$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$Desktop\DEATurnos.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\INICIAR_SISTEMA.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "Sistema DEATurnos - Gestión de Turnos con QR"
$Shortcut.Save()
Write-Host "[OK] Acceso directo 'DEATurnos' creado exitosamente en el Escritorio."
