# OpenVINO ChatBot Setup Guide

## Overview

This chatbot uses OpenVINO for local inference in the Tauri Rust backend. This provides fast, efficient AI responses without requiring cloud services or Python.

## Installation Steps

### 1. Install OpenVINO Runtime

#### macOS (using Homebrew):

```bash
brew install openvino
```

#### Linux (Ubuntu/Debian):

```bash
wget https://apt.repos.intel.com/intel-gpg-keys/GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB
sudo apt-key add GPG-PUB-KEY-INTEL-SW-PRODUCTS.PUB
echo "deb https://apt.repos.intel.com/openvino/2024 ubuntu22 main" | sudo tee /etc/apt/sources.list.d/intel-openvino-2024.list
sudo apt update
sudo apt install openvino
```

#### Manual Installation:

Download from: https://www.intel.com/content/www/us/en/developer/tools/openvino-toolkit/download.html

### 2. Set Environment Variables

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# For macOS Homebrew installation
export INTEL_OPENVINO_DIR=/opt/homebrew/opt/openvino
source $INTEL_OPENVINO_DIR/setupvars.sh

# For manual installation (adjust path as needed)
export INTEL_OPENVINO_DIR=/opt/intel/openvino_2024
source $INTEL_OPENVINO_DIR/setupvars.sh
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 3. Download a Model

You need an OpenVINO-compatible model. Here are recommended options:

#### Option A: TinyLlama (Recommended for testing - ~2GB)

```bash
# Install Optimum Intel for model conversion
pip install optimum[openvino]

# Convert and download TinyLlama
optimum-cli export openvino --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --task text-generation-with-past tinyllama-openvino

# This creates a directory with:
# - openvino_model.xml (model structure)
# - openvino_model.bin (weights)
# - tokenizer files
```

#### Option B: Phi-2 (Better quality - ~5GB)

```bash
optimum-cli export openvino --model microsoft/phi-2 --task text-generation-with-past phi2-openvino
```

#### Option C: Pre-converted OpenVINO Models

Check the OpenVINO Model Zoo: https://github.com/openvinotoolkit/open_model_zoo

### 4. Model Directory Structure

**Recommended location:** `PenPals/models/` (at project root)

This keeps models separate from code and excluded from version control.

After conversion, your directory should look like:

```
PenPals/
├── models/                          # <-- Place models here
│   ├── tinyllama-openvino/
│   │   ├── openvino_model.xml
│   │   ├── openvino_model.bin
│   │   ├── tokenizer.json
│   │   ├── tokenizer_config.json
│   │   └── special_tokens_map.json
│   └── .gitignore                   # Already created
├── penpals-frontend/
├── penpals-backend/
└── CHATBOT_SETUP.md
```

To download directly to this location:

```bash
cd /Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/models
optimum-cli export openvino --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --task text-generation-with-past --weight-format int8 tinyllama-openvino
```

### 5. Configure the Application

Create a configuration file or update the Tauri app to use your model:

**Option 1: Environment Variables**
Add to your `.env` file in the Tauri project root:

```bash
CHATBOT_MODEL_PATH=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/models/tinyllama-openvino/openvino_model.xml
CHATBOT_TOKENIZER_PATH=/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/models/tinyllama-openvino/tokenizer.json
```

**Option 2: Initialize from Frontend**
Call the initialization command from your React app:

```typescript
import { invoke } from "@tauri-apps/api/core";

const modelPath =
  "/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/models/tinyllama-openvino/openvino_model.xml";
const tokenizerPath =
  "/Users/philippbruhns/Documents/Year2/COMP0016_Systems_Engineering/PenPals/models/tinyllama-openvino/tokenizer.json";

await invoke("initialize_chat_model", {
  modelPath,
  tokenizerPath,
});
```

### 6. Build the Tauri Application

```bash
cd penpals-frontend
npm install
cd src-tauri
cargo build
```

**Note:** First build may take 10-15 minutes as it compiles OpenVINO dependencies.

### 7. Run the Application

```bash
cd penpals-frontend
npm run tauri dev
```

## Model Recommendations

| Model          | Size  | Speed     | Quality   | Use Case                         |
| -------------- | ----- | --------- | --------- | -------------------------------- |
| TinyLlama 1.1B | ~2GB  | Very Fast | Good      | Testing, quick responses         |
| Phi-2          | ~5GB  | Fast      | Better    | Production, better understanding |
| Llama-2 7B     | ~13GB | Medium    | Excellent | High quality responses           |
| Mistral 7B     | ~13GB | Medium    | Excellent | Production ready                 |

## Troubleshooting

### Build Errors

**Error: "openvino not found"**

- Ensure OpenVINO is installed and environment variables are set
- Run `source $INTEL_OPENVINO_DIR/setupvars.sh`
- Restart your terminal/IDE

**Error: "failed to compile openvino-sys"**

```bash
# Install build dependencies
# macOS
brew install cmake pkg-config

# Linux
sudo apt install cmake build-essential pkg-config
```

### Runtime Errors

**Error: "Model not loaded"**

- Check that the model path is correct
- Ensure both .xml and .bin files exist
- Verify tokenizer.json is present

**Error: "Tokenization failed"**

- Update tokenizer paths
- Try regenerating the model with optimum-cli

### Performance Issues

**Slow inference:**

1. Use INT8 quantized models for faster inference:

```bash
optimum-cli export openvino --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --weight-format int8 tinyllama-int8
```

2. Enable dynamic shapes:

```bash
optimum-cli export openvino --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --task text-generation-with-past --dynamic-shapes tinyllama-dynamic
```

## Advanced Configuration

### Custom Model Format

If your model uses a custom format, you may need to adjust the Rust code in `src-tauri/src/chat_model.rs`:

1. Update the `format_prompt` function to match your model's expected format
2. Modify `process_output_tensor` to handle your model's output structure
3. Adjust `max_length` for your use case

### Multiple Models

To support model switching:

```typescript
// In your React component
const switchModel = async (modelName: string) => {
  const models = {
    tinyllama: {
      modelPath: "/path/to/tinyllama/openvino_model.xml",
      tokenizerPath: "/path/to/tinyllama/tokenizer.json",
    },
    phi2: {
      modelPath: "/path/to/phi2/openvino_model.xml",
      tokenizerPath: "/path/to/phi2/tokenizer.json",
    },
  };

  const config = models[modelName];
  await invoke("initialize_chat_model", config);
};
```

## Additional Resources

- OpenVINO Documentation: https://docs.openvino.ai
- Model Zoo: https://github.com/openvinotoolkit/open_model_zoo
- Optimum Intel: https://huggingface.co/docs/optimum/intel/index
- Tauri Documentation: https://tauri.app/

## Quick Start Script

Save this as `setup_chatbot.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up OpenVINO ChatBot..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install optimum[openvino]

# Download and convert model
echo "🤖 Downloading TinyLlama model..."
mkdir -p models
cd models
optimum-cli export openvino --model TinyLlama/TinyLlama-1.1B-Chat-v1.0 --task text-generation-with-past --weight-format int8 tinyllama-openvino
cd ..

# Get absolute path
MODEL_PATH="$(pwd)/models/tinyllama-openvino/openvino_model.xml"
TOKENIZER_PATH="$(pwd)/models/tinyllama-openvino/tokenizer.json"

echo "✅ Setup complete!"
echo ""
echo "Model path: $MODEL_PATH"
echo "Tokenizer path: $TOKENIZER_PATH"
echo ""
echo "Add these to your app configuration or use them when initializing the model."
```

Run with:

```bash
chmod +x setup_chatbot.sh
./setup_chatbot.sh
```

## Testing

After setup, test the chatbot:

1. Start the application
2. Click the chat icon in the header
3. Send a test message: "Hello, how are you?"
4. Verify you receive a response

The first inference may take 5-10 seconds as the model loads into memory. Subsequent responses should be faster (1-3 seconds depending on your hardware).
