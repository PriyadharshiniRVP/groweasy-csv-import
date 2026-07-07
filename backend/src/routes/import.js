const express = require('express');
const upload = require('../middleware/upload');
const { parseCsv, CsvParseError } = require('../services/csvParser');
const { extractCrmRecords, AiConfigError } = require('../services/aiMapper');

const router = express.Router();

/**
 * POST /api/import
 * multipart/form-data, field name "file" - the raw CSV.
 *
 * Response:
 * {
 *   imported: [...CRM records],
 *   skipped: [{ source, reason }],
 *   totalImported: number,
 *   totalSkipped: number,
 *   headers: string[]  // original CSV headers, for reference
 * }
 */
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Expected multipart field "file".' });
    }

    const { headers, rows } = parseCsv(req.file.buffer);

    if (rows.length > 5000) {
      return res.status(413).json({
        error: `File has ${rows.length} rows. This demo endpoint caps imports at 5000 rows per request.`,
      });
    }

    const result = await extractCrmRecords(rows);

    return res.json({
      headers,
      totalSourceRows: rows.length,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// Central error handler for this router - keeps error shape consistent
// whether the failure came from parsing, validation, or the AI call.
router.use((err, req, res, next) => {
  if (err instanceof CsvParseError || err instanceof AiConfigError) {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
  if (err.message && err.message.includes('Only .csv')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled import error:', err);
  return res.status(500).json({ error: 'Internal server error while processing the import.' });
});

module.exports = router;
