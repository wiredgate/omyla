$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$source=Get-Content (Join-Path $PSScriptRoot 'windows-input.ps1') -Raw
[void][System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors)
if($errors.Count -gt 0){throw 'Native script has parser errors'}
$code=[regex]::Match($source,"(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
if(-not $code){throw 'Native C# definitions missing'}
Add-Type -TypeDefinition $code
if([System.Runtime.InteropServices.Marshal]::SizeOf([OmylaInput+Input]::new())-ne 40){throw 'INPUT layout mismatch'}
Write-Host 'Native helper parsed and compiled; x64 INPUT is 40 bytes. No OS input was sent.'
