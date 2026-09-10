$nodePath = "C:\Users\chris\AppData\Local\trunk\tools\node\22.16.0-12da8a4c27b144aedaf7d975e067667c"
$env:PATH = "$nodePath;$env:PATH"
Set-Location -Path $PSScriptRoot
& ".\node_modules\.bin\electron.cmd" .
