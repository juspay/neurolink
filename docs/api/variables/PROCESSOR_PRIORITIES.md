[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PROCESSOR_PRIORITIES

# Variable: PROCESSOR_PRIORITIES

> `const` **PROCESSOR_PRIORITIES**: `object`

Defined in: [types/processor.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L405)

Priority levels for file processors.
Lower number = higher priority = matched first.

This priority system ensures that:

- SVG files are processed as text (not images) since many AI providers don't support SVG format
- More specific processors match before generic ones
- Document types are processed in a logical order

## Type Declaration

### SVG

> `readonly` **SVG**: `5` = `5`

SVG files - processed as text before image processing

### IMAGE

> `readonly` **IMAGE**: `10` = `10`

Image files - AI vision processing

### PDF

> `readonly` **PDF**: `20` = `20`

PDF documents

### CSV

> `readonly` **CSV**: `30` = `30`

CSV/tabular data

### MARKDOWN

> `readonly` **MARKDOWN**: `40` = `40`

Markdown files - structured text

### JSON

> `readonly` **JSON**: `50` = `50`

JSON data files

### YAML

> `readonly` **YAML**: `60` = `60`

YAML configuration/data files

### XML

> `readonly` **XML**: `70` = `70`

XML data files

### HTML

> `readonly` **HTML**: `80` = `80`

HTML web content

### EXCEL

> `readonly` **EXCEL**: `90` = `90`

Excel spreadsheets

### DOC

> `readonly` **DOC**: `95` = `95`

Legacy .doc files

### WORD

> `readonly` **WORD**: `100` = `100`

Word documents (.docx)

### TEXT

> `readonly` **TEXT**: `110` = `110`

Plain text files

### SOURCE_CODE

> `readonly` **SOURCE_CODE**: `120` = `120`

Source code files

### CONFIG

> `readonly` **CONFIG**: `130` = `130`

Configuration files

### RTF

> `readonly` **RTF**: `140` = `140`

RTF documents

### OPENDOCUMENT

> `readonly` **OPENDOCUMENT**: `150` = `150`

OpenDocument format files

### VIDEO

> `readonly` **VIDEO**: `160` = `160`

Video files

### AUDIO

> `readonly` **AUDIO**: `170` = `170`

Audio files

### ARCHIVE

> `readonly` **ARCHIVE**: `180` = `180`

Archive files
