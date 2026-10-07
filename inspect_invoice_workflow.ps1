$root='\\Alimohajeristee\حسابداری\share 1405'
$pic=Join-Path $root 'pic\New folder (2)'
Write-Output "ROOT_EXISTS=$(Test-Path -LiteralPath $root)"
Write-Output "PIC_EXISTS=$(Test-Path -LiteralPath $pic)"
if(Test-Path -LiteralPath $root){
  Write-Output '---ROOT SAMPLE---'
  Get-ChildItem -LiteralPath $root -Force -ErrorAction SilentlyContinue | Select-Object -First 40 Name,FullName,PSIsContainer | Format-Table -AutoSize
}
if(Test-Path -LiteralPath $pic){
  Write-Output '---PIC SAMPLE---'
  Get-ChildItem -LiteralPath $pic -File -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 25 Name,Length,FullName | Format-Table -AutoSize
}
