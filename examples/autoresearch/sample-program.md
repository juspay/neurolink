# Research Program: Minimize Validation Bits-Per-Byte

## Objective

Improve the training script `train.py` to achieve the lowest possible validation bits-per-byte (val_bpb) on the target dataset. Lower is better.

## Constraints

- Only modify `train.py` — all other files are read-only
- The script must complete within the timeout (default: 10 minutes)
- The script must print `val_bpb: <number>` to stdout on completion
- Memory usage should remain reasonable (track `peak_vram_mb` if available)
- Changes must be incremental — one idea per experiment

## Evaluation

- Primary metric: `val_bpb` (lower is better)
- Secondary metric: `peak_vram_mb` (informational only)
- A change is "kept" if it produces a lower val_bpb than the current best
- Crashed or timed-out experiments are automatically reverted

## Strategy Suggestions

Consider these optimization directions (but use your judgment):

1. **Learning rate** — Try different learning rates, schedules, or warmup strategies
2. **Architecture** — Adjust layer sizes, attention heads, or activation functions
3. **Regularization** — Experiment with dropout, weight decay, or gradient clipping
4. **Data processing** — Modify batch size, sequence length, or data augmentation
5. **Optimizer** — Try different optimizers (Adam, AdamW, SGD with momentum)
6. **Initialization** — Experiment with weight initialization schemes

## Context

The baseline model achieves approximately 1.5 val_bpb. Previous experiments have shown that learning rate tuning and architecture changes have the most impact. Regularization changes tend to be more subtle.

## Output Format

The training script must print exactly one line matching:

```
val_bpb: <float>
```

Optionally, it may also print:

```
peak_vram_mb: <float>
```
