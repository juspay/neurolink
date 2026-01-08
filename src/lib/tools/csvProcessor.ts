import type { FileProcessingResult } from '$lib/types/sdkTypes';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

/**
 * Parse CSV content and return as array of objects
 */
export async function parseCSV(content: string): Promise<Record<string, string>[]> {
	const results: Record<string, string>[] = [];

	return new Promise((resolve, reject) => {
		const stream = Readable.from([content]);

		stream
			.pipe(
				csvParser({
					mapHeaders: ({ header }) => header.trim(),
					mapValues: ({ value }) => value.trim(),
					skipLines: 0
				})
			)
			.on('data', (data: Record<string, string>) => results.push(data))
			.on('end', () => resolve(results))
			.on('error', (error: Error) => reject(error));
	});
}

/**
 * Process CSV file and return result based on format
 */
export async function processCSV(
	content: string,
	format: 'raw' | 'json' | 'markdown' = 'raw'
): Promise<FileProcessingResult> {
	try {
		if (format === 'raw') {
			// For raw format, just return the content as-is with basic metadata
			const lines = content.split(/\r\n|\n|\r/).filter((line) => line.trim());
			const rowCount = Math.max(0, lines.length - 1); // Exclude header

			return {
				content,
				metadata: {
					format: 'csv',
					rowCount,
					encoding: 'utf-8'
				}
			};
		}

		// Parse CSV for json and markdown formats
		const parsedData = await parseCSV(content);

		if (format === 'json') {
			return {
				content: JSON.stringify(parsedData, null, 2),
				metadata: {
					format: 'json',
					rowCount: parsedData.length,
					encoding: 'utf-8'
				}
			};
		}

		if (format === 'markdown') {
			const markdown = convertToMarkdown(parsedData);
			return {
				content: markdown,
				metadata: {
					format: 'markdown',
					rowCount: parsedData.length,
					encoding: 'utf-8'
				}
			};
		}

		throw new Error(`Unsupported format: ${format}`);
	} catch (error) {
		throw new Error(
			`Failed to process CSV: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Convert parsed CSV data to markdown table format
 */
function convertToMarkdown(data: Record<string, string>[]): string {
	if (data.length === 0) return '';

	const headers = Object.keys(data[0]);
	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;

	const dataRows = data.map((row) => {
		const values = headers.map((header) => row[header] || '');
		return `| ${values.join(' | ')} |`;
	});

	return [headerRow, separatorRow, ...dataRows].join('\n');
}
