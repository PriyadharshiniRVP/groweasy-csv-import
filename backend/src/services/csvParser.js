const { parse } = require('csv-parse/sync');

/**
 * Parses an uploaded CSV buffer into an array of plain row objects.
 * Deliberately does NOT assume anything about column names - whatever
 * headers exist in row 1 become the object keys, verbatim. Field mapping
 * to the CRM schema happens later, in the AI layer.
 *
 * @param {Buffer|string} csvContent
 * @returns {{ headers: string[], rows: Record<string,string>[] }}
 */
function parseCsv(csvContent) {
  const content = Buffer.isBuffer(csvContent) ? csvContent.toString('utf-8') : csvContent;

  if (!content || !content.trim()) {
    throw new CsvParseError('The uploaded file is empty.');
  }

  let records;
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // real-world exports often have ragged rows
      bom: true,
    });
  } catch (err) {
    throw new CsvParseError(`Could not parse CSV: ${err.message}`);
  }

  if (!records.length) {
    throw new CsvParseError('No data rows found in the CSV.');
  }

  const headers = Object.keys(records[0]);
  return { headers, rows: records };
}

class CsvParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CsvParseError';
    this.statusCode = 400;
  }
}

module.exports = { parseCsv, CsvParseError };
