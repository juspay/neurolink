# Audio Test Fixtures

This directory contains audio test fixtures in various formats for testing audio processing capabilities.

## Files

| File            | Format | Duration | Language | Size   | Description                                           |
| --------------- | ------ | -------- | -------- | ------ | ----------------------------------------------------- |
| `sample.mp3`    | MP3    | ~5 sec   | English  | 80 KB  | General purpose English speech sample                 |
| `sample.wav`    | WAV    | ~3 sec   | English  | 114 KB | Uncompressed WAV format sample                        |
| `sample.m4a`    | M4A    | ~4 sec   | English  | 46 KB  | AAC encoded M4A format sample                         |
| `sample.ogg`    | OGG    | ~3 sec   | English  | 25 KB  | Vorbis encoded OGG format sample                      |
| `sample.flac`   | FLAC   | ~3 sec   | English  | 76 KB  | Lossless FLAC format sample                           |
| `spanish.mp3`   | MP3    | ~5 sec   | Spanish  | 80 KB  | Spanish speech sample for multilingual testing        |
| `corrupted.mp3` | MP3    | N/A      | N/A      | 11 KB  | Intentionally corrupted file for error handling tests |

## Generation

All audio files were generated using:

- **espeak** (v1.48.15) for text-to-speech synthesis
- **ffmpeg** (v6.1.1) for audio encoding and format conversion

### Sample Commands

```bash
# Generate English speech
espeak -w temp.wav "Your text here" -s 120

# Convert to MP3
ffmpeg -i temp.wav -codec:a libmp3lame -b:a 128k -ar 44100 -t 5 sample.mp3 -y

# Convert to WAV
ffmpeg -i temp.wav -codec:a pcm_s16le -ar 22050 -t 3 sample.wav -y

# Convert to M4A
ffmpeg -i temp.wav -codec:a aac -b:a 96k -ar 44100 -t 4 sample.m4a -y

# Convert to OGG
ffmpeg -i temp.wav -codec:a libvorbis -q:a 4 -ar 44100 -t 3 sample.ogg -y

# Convert to FLAC
ffmpeg -i temp.wav -codec:a flac -ar 44100 -t 3 sample.flac -y

# Generate Spanish speech
espeak -v es -w temp.wav "Tu texto aquí" -s 120
```

## Usage

These fixtures are intended for:

- Testing audio file format detection
- Validating audio processing pipelines
- Testing multilingual audio support
- Error handling with corrupted files

## Validation

All valid audio files can be verified using:

```bash
ffprobe <filename>
```

The corrupted.mp3 file should intentionally fail validation.

## Size Constraints

All files are kept under 1MB (total directory size: ~444 KB) to ensure:

- Fast test execution
- Minimal repository size impact
- Easy CI/CD integration
