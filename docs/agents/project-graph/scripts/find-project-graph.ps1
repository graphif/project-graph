$ErrorActionPreference = "Stop"

if ($env:PROJECT_GRAPH_CLI) {
  $candidate = [IO.Path]::GetFullPath($env:PROJECT_GRAPH_CLI)
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { throw "PROJECT_GRAPH_CLI does not point to a file: $candidate" }
  Write-Output $candidate
  exit 0
}

$command = Get-Command project-graph.exe -ErrorAction SilentlyContinue
if ($command -and (Test-Path -LiteralPath $command.Source -PathType Leaf)) {
  Write-Output ([IO.Path]::GetFullPath($command.Source))
  exit 0
}

$locations = @(
  "HKCU:\Software\Graphif\Project Graph",
  "HKLM:\Software\Graphif\Project Graph",
  "HKLM:\Software\WOW6432Node\Graphif\Project Graph"
)
foreach ($location in $locations) {
  $properties = Get-ItemProperty -LiteralPath $location -ErrorAction SilentlyContinue
  if (-not $properties) { continue }
  foreach ($value in @($properties.CliPath, $properties.InstallLocation)) {
    if (-not $value) { continue }
    $candidate = if ([IO.Path]::GetExtension($value) -ieq ".exe") { $value } else { Join-Path $value "project-graph.exe" }
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      Write-Output ([IO.Path]::GetFullPath($candidate))
      exit 0
    }
  }
}

throw "Project Graph CLI was not found. Set PROJECT_GRAPH_CLI to its absolute path."
