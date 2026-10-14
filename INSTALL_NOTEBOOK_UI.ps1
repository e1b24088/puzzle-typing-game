$ErrorActionPreference = 'Stop'
$appPath = Join-Path $PSScriptRoot 'frontend\src\App.vue'
$source = [IO.File]::ReadAllText($appPath)
if ($source.Contains('<TypingResultView')) {
    Write-Host 'TypingResultView is already connected. No App.vue changes needed.'
    exit 0
}
if ($source -notmatch 'function\s+show\s*\(' -or $source -notmatch 'typingResult' -or $source -notmatch 'learningTip') {
    throw 'App.vue differs from the expected structure. No changes made. Share App.vue to adapt integration.'
}
$pattern = '(?s)<section\b[^>]*v-else-if="screen === ''typing-result''"[^>]*>.*?</section>'
$matches = [regex]::Matches($source, $pattern)
if ($matches.Count -ne 1) { throw 'Could not identify exactly one typing result section. App.vue was not changed.' }
$replacement = '<TypingResultView v-else-if="screen === ''typing-result''" :result="typingResult" :course-score="courseResult?.score ?? null" :mode="mode" :learning-tip="learningTip" @back="show(''title'')" @behind="show(''behind'')" />'
$updated = [regex]::Replace($source, $pattern, $replacement)
if (-not $updated.Contains('import TypingResultView')) {
    if ($updated -notmatch '<script setup>') { throw 'script setup was not found. App.vue was not changed.' }
    $updated = $updated.Replace('<script setup>', "<script setup>`nimport TypingResultView from './views/TypingResultView.vue'")
}
$appBackup = Join-Path $env:TEMP ('App-notebook-' + [guid]::NewGuid() + '.vue')
[IO.File]::Copy($appPath, $appBackup)
[IO.File]::WriteAllText($appPath, $updated, [Text.UTF8Encoding]::new($false))
Write-Host ('Notebook result UI connected. Original App.vue saved at: ' + $appBackup)
