# Research Program: Minimize val_bpb

## Goal

Minimize the val_bpb metric printed by train.py.

## Current State

train.py currently prints a fixed val_bpb value of 0.997900.

## Instructions

- Modify the computation in train.py to produce a LOWER val_bpb value
- The metric is extracted from stdout using the pattern: val_bpb:\s+([\d.]+)
- Keep the same output format: "val_bpb: <number>"
- Keep the same output format: "peak_vram_mb: <number>"
- The sleep(0.5) can be reduced or removed for faster execution
- Only modify train.py (it is in the mutable paths)
