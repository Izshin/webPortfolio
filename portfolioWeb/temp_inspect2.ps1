$bytes = [System.IO.File]::ReadAllBytes("c:\Users\Usuario\Desktop\webPortfolio\portfolioWeb\public\models\bonsaitree\source\Bonsai_Final.fbx")
$text = [System.Text.Encoding]::ASCII.GetString($bytes)
$m = [regex]::Matches($text, "Model::[ -~]{2,40}")
$m | ForEach-Object { $_.Value } | Select-Object -Unique -First 60
