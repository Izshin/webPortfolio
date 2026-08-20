$bytes = [System.IO.File]::ReadAllBytes("c:\Users\Usuario\Desktop\webPortfolio\portfolioWeb\public\models\bonsaitree\source\Bonsai_Final.fbx")
$text = [System.Text.Encoding]::ASCII.GetString($bytes)
$m = [regex]::Matches($text, "[ -~]{4,50}")
$m | ForEach-Object { $_.Value } | Where-Object { $_ -match "Plane|Pot|Trunk|Leaf|Bonsai" } | Select-Object -Unique -First 60
