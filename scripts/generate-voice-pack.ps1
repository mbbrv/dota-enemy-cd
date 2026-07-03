param(
  [string]$VoiceName = "Microsoft Zira Desktop",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$presetPath = Join-Path $rootDir "presets.js"
$audioDir = Join-Path $rootDir "voice-pack\audio"
$manifestPath = Join-Path $rootDir "voice-pack\manifest.js"

New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$extractScript = @'
global.window = {};
require(process.argv[2]);

const bundle = window.DOTA_ENEMY_CD_PRESETS || {};
const names = new Set(["Cooldown"]);

for (const hero of bundle.heroes || []) {
  for (const ability of hero.abilities || []) {
    if (ability?.name) names.add(ability.name);
  }
}

for (const addon of bundle.addons || []) {
  if (addon?.name) names.add(addon.name);
}

console.log(JSON.stringify([...names].sort((a, b) => a.localeCompare(b))));
'@

$tempExtractPath = Join-Path ([System.IO.Path]::GetTempPath()) "dota-enemy-cd-extract-presets.cjs"
Set-Content -Path $tempExtractPath -Value $extractScript -Encoding UTF8

try {
  $namesJson = & node $tempExtractPath $presetPath
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read presets with Node.js."
  }
} finally {
  Remove-Item -Path $tempExtractPath -Force -ErrorAction SilentlyContinue
}

$names = $namesJson | ConvertFrom-Json

$voice = New-Object -ComObject SAPI.SpVoice
$voices = $voice.GetVoices()
$voiceToken = $null

for ($i = 0; $i -lt $voices.Count; $i++) {
  $token = $voices.Item($i)
  if ($token.GetDescription() -like "*$VoiceName*") {
    $voiceToken = $token
    break
  }
}

if (-not $voiceToken) {
  for ($i = 0; $i -lt $voices.Count; $i++) {
    $token = $voices.Item($i)
    if ($token.GetDescription() -like "*English*") {
      $voiceToken = $token
      break
    }
  }
}

if (-not $voiceToken) {
  throw "No enabled English SAPI voice is installed."
}

$voice.Voice = $voiceToken
$voice.Rate = -1
$voice.Volume = 100
$waveFormat = New-Object -ComObject SAPI.SpAudioFormat
$waveFormat.Type = 22

$pronunciations = @{
  "Aghanim" = "Aganim"
  "Aghanim's" = "Aganim's"
  "Black King Bar" = "B K B"
  "BKB" = "B K B"
  "Chronosphere" = "Chrono sphere"
  "Omnislash" = "Omni slash"
  "Outworld Destroyer" = "Outworld Destroyer"
  "Refresher Orb" = "Refresher orb"
}

function ConvertTo-VoicePackSlug {
  param([string]$Value)

  $slug = $Value.ToLowerInvariant()
  $slug = $slug -replace "&", " and "
  $slug = $slug -replace "['’]", ""
  $slug = $slug -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  return $slug
}

function Get-SpokenLabel {
  param([string]$Name)

  if ($pronunciations.ContainsKey($Name)) {
    return $pronunciations[$Name]
  }

  $spoken = $Name
  foreach ($entry in $pronunciations.GetEnumerator()) {
    $pattern = "\b" + [regex]::Escape($entry.Key) + "\b"
    $spoken = [regex]::Replace($spoken, $pattern, $entry.Value)
  }

  return $spoken
}

function Escape-JsString {
  param([string]$Value)

  return $Value.Replace("\", "\\").Replace('"', '\"')
}

$manifestEntries = New-Object System.Collections.Generic.List[string]
$generated = 0
$skipped = 0

foreach ($name in $names) {
  $slug = ConvertTo-VoicePackSlug $name
  if (-not $slug) {
    continue
  }

  $fileName = "$slug-ready.wav"
  $filePath = Join-Path $audioDir $fileName
  $manifestEntries.Add(("    ""{0}"": ""voice-pack/audio/{1}""" -f (Escape-JsString $name), $fileName))

  if ((Test-Path $filePath) -and -not $Force) {
    $skipped += 1
    continue
  }

  $spoken = Get-SpokenLabel $name
  $text = "$spoken ready"
  if (Test-Path $filePath) {
    Remove-Item -LiteralPath $filePath -Force
  }

  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format = $waveFormat
  $stream.Open($filePath, 3, $false)
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak($text, 0)
  $stream.Close()
  $generated += 1
}

$manifestBody = $manifestEntries -join ",`r`n"
$manifestContent = @"
"use strict";

// Bundled voice pack manifest.
// Regenerate with: npm run voice-pack:generate
window.DOTA_ENEMY_CD_VOICE_PACK = {
  files: {
$manifestBody
  },
  fallback: "voice-pack/audio/cooldown-ready.wav",
};
"@

Set-Content -Path $manifestPath -Value $manifestContent -Encoding UTF8

Write-Host "Voice pack generated with '$($voiceToken.GetDescription())'."
Write-Host "Generated: $generated"
Write-Host "Skipped: $skipped"
Write-Host "Manifest: $manifestPath"
