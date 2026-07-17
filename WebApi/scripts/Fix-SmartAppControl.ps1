#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Fixes RankUpEducation.Api startup blocked by Windows Smart App Control (0x800711C7).

.DESCRIPTION
  Sets Smart App Control to Evaluation mode so local Debug builds can load.
  You must reboot after this script succeeds.
#>

$ErrorActionPreference = "Stop"
$policyPath = "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy"
$name = "VerifiedAndReputablePolicyState"

if (-not (Test-Path $policyPath)) {
    throw "Smart App Control policy key was not found."
}

$before = (Get-ItemProperty -Path $policyPath -Name $name).$name
Write-Host "Current Smart App Control state: $before  (0=Off, 1=Enforcement, 2=Evaluation)"

# Evaluation lets local unsigned/dev builds run while still reporting.
Set-ItemProperty -Path $policyPath -Name $name -Value 2 -Type DWord
$after = (Get-ItemProperty -Path $policyPath -Name $name).$name
Write-Host "Updated Smart App Control state: $after (Evaluation)"

Write-Host ""
Write-Host "Next steps:"
Write-Host "1) Reboot this PC."
Write-Host "2) In Visual Studio: Build > Clean Solution, then Rebuild."
Write-Host "3) Run RankUpEducation.Api again."
Write-Host ""

$reboot = Read-Host "Reboot now? (Y/N)"
if ($reboot -match '^[Yy]') {
    Restart-Computer -Force
}
