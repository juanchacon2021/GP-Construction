param(
	[string]$SiteRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

$ErrorActionPreference = 'Stop'

function Test-CommandExists {
	param([string]$Name)
	return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$ffmpegOk = Test-CommandExists "ffmpeg"
if (-not $ffmpegOk) {
	Write-Host "No encontré 'ffmpeg' en PATH." -ForegroundColor Yellow
	Write-Host "Instálalo y vuelve a correr este script." -ForegroundColor Yellow
	Write-Host "Opciones comunes:" -ForegroundColor Yellow
	Write-Host "- winget install --id Gyan.FFmpeg -e" -ForegroundColor Yellow
	Write-Host "- choco install ffmpeg" -ForegroundColor Yellow
	exit 2
}

$inDir = Join-Path $SiteRoot "assets\img"
$outDir = Join-Path $SiteRoot "assets\opt\video"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$jobs = @(
	@{
		In = (Join-Path $inDir "Secuencia.mp4")
		Out = (Join-Path $outDir "Secuencia-opt.mp4")
		Args = @(
			'-y',
			'-i', (Join-Path $inDir "Secuencia.mp4"),
			'-vf', "scale='min(1280,iw)':-2",
			'-c:v', 'libx264',
			'-preset', 'medium',
			'-crf', '28',
			'-pix_fmt', 'yuv420p',
			'-movflags', '+faststart',
			'-an',
			(Join-Path $outDir "Secuencia-opt.mp4")
		)
	},
	@{
		In = (Join-Path $inDir "LOGO GP1.mp4")
		Out = (Join-Path $outDir "LOGO GP1-opt.mp4")
		Args = @(
			'-y',
			'-i', (Join-Path $inDir "LOGO GP1.mp4"),
			'-vf', "scale='min(720,iw)':-2",
			'-c:v', 'libx264',
			'-preset', 'medium',
			'-crf', '28',
			'-pix_fmt', 'yuv420p',
			'-movflags', '+faststart',
			'-an',
			(Join-Path $outDir "LOGO GP1-opt.mp4")
		)
	}
)

foreach ($job in $jobs) {
	if (-not (Test-Path $job.In)) {
		Write-Host "Omitido: no existe $($job.In)" -ForegroundColor Yellow
		continue
	}

	Write-Host "Optimizando: $($job.In) -> $($job.Out)" -ForegroundColor Cyan
	& ffmpeg @($job.Args)
}

Write-Host "Listo. Salida: $outDir" -ForegroundColor Green
