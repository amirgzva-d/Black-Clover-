$files=@(
'C:\Users\cibesabz\Black-Clover-Live\src\main\main.js',
'C:\Users\cibesabz\Black-Clover-Live\src\agent\ProjectService.js',
'C:\Users\cibesabz\Black-Clover-Live\src\agent\GroundedKnowledge.js'
)
foreach($p in $files){
  $s=[IO.File]::ReadAllText($p)
  $s=$s.Replace('}\nasync function refreshBrainProviders', "}`r`nasync function refreshBrainProviders")
  $s=$s.Replace(';}\n  async list()', ";}`r`n  async list()")
  $s=$s.Replace('true;\n  return factual', "true;`r`n  return factual")
  [IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false))
}
Write-Host fixed