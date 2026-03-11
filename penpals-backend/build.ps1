$ErrorActionPreference = "Stop"

$RepoRoot = "C:\Path\To\PenPals\penpals-backend"
$VenvSite = "C:\Path\To\PenPals\.venv\Lib\site-packages"
$ModelSrc = Join-Path $RepoRoot "models\qwen3-1.7b-int4-ov"
$DistDir = Join-Path $RepoRoot "build\app.dist"
$OpenVinoLibsSrc = Join-Path $VenvSite "openvino\libs"
$OpenVinoTokLibSrc = Join-Path $VenvSite "openvino_tokenizers\lib"

Set-Location $RepoRoot

# Clean first (important)
if (Test-Path "build\app.dist") { Remove-Item "build\app.dist" -Recurse -Force }
if (Test-Path "build\app.build") { Remove-Item "build\app.build" -Recurse -Force }

# Resolve tokenizer DLL dynamically
$TokenizerDll = Get-ChildItem $OpenVinoTokLibSrc -Filter "*openvino*tokenizer*.dll" -File | Select-Object -First 1
if (-not $TokenizerDll) { throw "Tokenizer DLL not found in $OpenVinoTokLibSrc" }

py -3 -m nuitka `
  --standalone `
  --follow-imports `
  --assume-yes-for-downloads `
  --output-dir=build `
  --output-filename=penpals-backend `
  --include-package=openvino `
  --include-package-data=openvino `
  --include-package=openvino_tokenizers `
  --include-package-data=openvino_tokenizers `
  --include-data-file="$($TokenizerDll.FullName)=openvino_tokenizers.dll" `
  --include-package=openvino_genai `
  --include-package-data=openvino_genai `
  --include-package=chromadb `
  --include-package=faster_whisper `
  --include-package-data=chromadb `
  --include-data-file=src/.env=.env `
  --include-data-file=src/.env=src/.env `
  --include-data-dir=penpals_db=penpals_db `
  --include-data-dir=chroma_db=chroma_db `
  src/app.py

# Manual copy of model and OpenVINO runtime libs (reliable workaround)
New-Item -ItemType Directory -Force -Path "$DistDir\models\qwen3-1.7b-int4-ov" | Out-Null
Copy-Item "$ModelSrc\*" "$DistDir\models\qwen3-1.7b-int4-ov\" -Recurse -Force

New-Item -ItemType Directory -Force -Path "$DistDir\openvino\libs" | Out-Null
Copy-Item "$OpenVinoLibsSrc\*" "$DistDir\openvino\libs\" -Recurse -Force

# Runtime env
$env:OPENVINO_LIB_PATH = "$DistDir\openvino\libs"
$env:OPENVINO_MODEL_DIR = "$DistDir\models\qwen3-1.7b-int4-ov"
$env:PATH = "$DistDir\openvino\libs;$env:PATH"

& "$DistDir\penpals-backend.exe"