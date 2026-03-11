cd /Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend

python3 -m nuitka \
  --standalone \
  --follow-imports \
  --assume-yes-for-downloads \
  --output-dir=build \
  --output-filename=penpals-backend \
  --include-package=openvino \
  --include-package-data=openvino \
  --include-package=openvino_tokenizers \
  --include-package-data=openvino_tokenizers \
  --include-data-file=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino_tokenizers/lib/libopenvino_tokenizers.dylib=libopenvino_tokenizers.dylib \
  --include-data-file=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino/libs/libopenvino_ir_frontend.2541.dylib=libopenvino_ir_frontend.2541.dylib \
  --include-data-file=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino/libs/libopenvino_c.2541.dylib=libopenvino_c.2541.dylib \
  --include-data-file=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino/libs/libhwloc.dylib=libhwloc.dylib \
  --include-data-dir=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino/libs=openvino/libs \
  --include-package=openvino_genai \
  --include-package-data=openvino_genai \
  --include-package=chromadb \
  --include-package=faster_whisper \
  --include-package-data=chromadb \
  --include-data-file=src/.env=.env \
  --include-data-file=src/.env=src/.env \
  --include-data-dir=penpals_db=penpals_db \
  --include-data-dir=chroma_db=chroma_db \
  --include-data-dir=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/models/qwen3-1.7b-int4-ov=models/qwen3-1.7b-int4-ov \
  src/app.py

cp -r /Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/models/qwen3-1.7b-int4-ov/ \
     build/app.dist/models/qwen3-1.7b-int4-ov/

cp -f /Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/.venv/lib/python3.12/site-packages/openvino/libs/* \
      build/app.dist/openvino/libs/

# OPENVINO_MODEL_DIR=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/models/qwen3-1.7b-int4-ov ./build/app.dist/penpals-backend

# OPENVINO_LIB_PATH=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/openvino/libs OPENVINO_MODEL_DIR=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/models/qwen3-1.7b-int4-ov ./build/app.dist/penpals-backend

DYLD_LIBRARY_PATH=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/openvino/libs \
OPENVINO_LIB_PATH=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/openvino/libs \
OPENVINO_MODEL_DIR=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/penpals-backend/build/app.dist/models/qwen3-1.7b-int4-ov \
./build/app.dist/penpals-backend

rm -rf build/app.dist build/app.build
