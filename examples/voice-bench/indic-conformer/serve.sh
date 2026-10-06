#!/bin/sh
# IndicConformer-600M (ai4bharat) as an OpenAI-compatible STT on http://127.0.0.1:8007
# First run:  cd indic-conformer && uv venv --python 3.12 && VIRTUAL_ENV=$PWD/.venv uv pip install -r requirements.txt
# The model is gated on Hugging Face: accept its terms and `huggingface-cli login` once.
cd "$(dirname "$0")" && exec .venv/bin/python server.py
