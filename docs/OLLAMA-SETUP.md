# 🦙 Ollama Setup Guide

Complete guide for setting up Ollama with NeuroLink for local AI capabilities.

## 🍎 macOS Installation

### Method 1: Homebrew (Recommended)

```bash
# Install Ollama
brew install ollama

# Start Ollama service (auto-starts on install)
ollama serve
```

### Method 2: Direct Download

1. Download from [ollama.ai](https://ollama.ai)
2. Open the .dmg file
3. Drag Ollama to Applications
4. Launch from Applications

### Verify Installation

```bash
ollama --version
ollama list
```

## 🐧 Linux Installation

### Ubuntu/Debian

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Manual Installation

```bash
# Download binary
curl -L https://ollama.ai/download/ollama-linux-amd64 -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama
After=network.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable ollama
sudo systemctl start ollama
```

## 🪟 Windows Installation

### Requirements

- Windows 10/11
- WSL2 (recommended) or native

### Native Windows

1. Download installer from [ollama.ai](https://ollama.ai)
2. Run the .exe installer
3. Follow installation wizard
4. Ollama starts automatically

### WSL2 (Recommended)

```bash
# Inside WSL2
curl -fsSL https://ollama.ai/install.sh | sh
```

## 🚀 Getting Started

### 1. Pull Your First Model

NeuroLink's CLI now checks for the default model (`llama3.2:latest`) and will prompt you to pull it if it's missing. You can also pull other models manually:

```bash
# Pull Llama 2 (default)
ollama pull llama2

# Pull Code Llama for coding
ollama pull codellama

# Pull Mistral for balanced performance
ollama pull mistral
```

### 2. Test with NeuroLink

```bash
# Test Ollama integration
npx @juspay/neurolink generate "Hello from local AI!" --provider ollama

# Use specific model
npx @juspay/neurolink generate "Write code" --provider ollama --model codellama
```

### 3. Manage Models

```bash
# List installed models
ollama list

# Remove a model
ollama rm llama2

# Show model information
ollama show llama2
```

## 🔧 Troubleshooting

### Ollama Service Not Running

```bash
# Check status
ollama list  # Should show models or error

# Start manually
ollama serve

# Check if port is in use
lsof -i :11434  # macOS/Linux
netstat -an | findstr 11434  # Windows
```

### Connection Refused

1. Ensure Ollama is running: `ollama serve`
2. Check firewall settings
3. Verify port 11434 is accessible
4. Try: `curl http://localhost:11434/api/tags`

### Model Download Issues

- Check disk space (models are 4-7GB)
- Verify internet connection
- Try alternative model: `ollama pull tinyllama`

### Performance Issues

- Close other applications
- Use smaller models (tinyllama, phi)
- Increase system swap/page file
- Consider GPU acceleration (NVIDIA)

## 🎯 Model Recommendations

### By Use Case

- **General Purpose**: llama2 (7B)
- **Coding**: codellama (7B)
- **Fast Responses**: mistral (7B), tinyllama (1B)
- **Creative Writing**: llama2-uncensored
- **Technical Tasks**: mixtral (if you have 48GB+ RAM)

### By System Resources

- **8GB RAM**: tinyllama, phi
- **16GB RAM**: llama2, mistral, codellama
- **32GB+ RAM**: mixtral, llama2:13b

## 🔒 Privacy & Security

### Data Privacy

- **100% Local**: No data sent to external servers
- **No Analytics**: Ollama doesn't track usage
- **Air-Gap Capable**: Works completely offline

### Resource Management

```bash
# Set memory limit
OLLAMA_MAX_MEMORY=8GB ollama serve

# Use specific GPU
OLLAMA_CUDA_DEVICE=0 ollama serve

# CPU only mode
OLLAMA_GPU_DRIVER=cpu ollama serve
```

## 🚀 Advanced Configuration

### Environment Variables

```bash
# Custom models directory
export OLLAMA_MODELS=/path/to/models

# Custom host (for remote access)
export OLLAMA_HOST=0.0.0.0:11434

# Keep models in memory longer
export OLLAMA_KEEP_ALIVE=10m
```

### Remote Access

```bash
# Allow remote connections
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# Connect from NeuroLink
export OLLAMA_BASE_URL=http://remote-host:11434
```

### GPU Acceleration

- **NVIDIA**: Automatically detected if CUDA is installed
- **AMD**: ROCm support on Linux
- **Apple Silicon**: Metal acceleration on M1/M2/M3

## 📚 Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Model Library](https://ollama.ai/library)
- [NeuroLink Examples](examples/index.md)
- [Community Discord](https://discord.gg/ollama)
