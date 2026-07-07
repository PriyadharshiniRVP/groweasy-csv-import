const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, CRM_FIELDS, BATCH_SIZE, MAX_RETRIES } = require('../config/constants');
const { sanitizeRecord } = require('./validator');

// Gemini's Flash / Flash-Lite models are free (no credit card, no expiry) as
// of mid-2026, which is why they're the default here. See backend/.env.example
// for how to get a key, and the README for how to swap in OpenAI/Claude instead.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a data-mapping engine for a real-estate / sales CRM called GrowEasy.

You will be given a JSON array of "source rows". Each source row is an object whose keys are
whatever column headers happened to exist in an arbitrary CSV export (Facebook Lead Ads, Google
Ads, a real-estate CRM, a manually built spreadsheet, etc). Column names are NOT standardized and
will vary between uploads - your job is to understand the MEANING of each column from its name
and its values, not to match on exact header text.

For every source row, produce one CRM record with EXACTLY these fields (use "" for any field you
cannot confidently determine - never invent data):

${CRM_FIELDS.map((f) => `- ${f}`).join('\n')}

Field-specific rules you MUST follow:

1. crm_status - choose the single best match from this fixed list, or "" if nothing fits:
   ${CRM_STATUS_VALUES.join(', ')}

2. data_source - choose the single best match from this fixed list, or "" if nothing fits confidently:
   ${DATA_SOURCE_VALUES.join(', ')}

3. created_at - output a date string that JavaScript's \`new Date(value)\` can parse (e.g.
   "2026-05-13 14:20:48" or an ISO 8601 string). If the source has no usable date, use "".

4. crm_note - use this field as a catch-all for: general remarks, follow-up notes, extra phone
   numbers beyond the first, extra email addresses beyond the first, and any other useful
   information from the row that doesn't map cleanly to another field. This is IMPORTANT: scan
   EVERY column in the source row for free-text content (comments, remarks, notes, feedback,
   descriptions, "why interested", agent comments, etc). If ANY column contains a sentence,
   phrase, or free-form comment that isn't a name/email/phone/location/date, you MUST copy its
   full text into crm_note - never drop it, even if you're unsure which field it "belongs" to.
   CRITICAL: using a column's text to help you infer crm_status (or any other field) does NOT
   exempt you from also copying that same text into crm_note. The two jobs are independent -
   inferring a value from free text, and preserving that free text for a human to read later -
   and you must always do both when a column contains a sentence or comment.

5. Multiple emails/phones - if a row contains more than one email address, put the first one in
   "email" and append the rest into "crm_note". Do the same for phone numbers with
   "mobile_without_country_code".

6. country_code - a phone country calling code such as "+91". Infer it from the phone number
   format or country if possible; otherwise "".

7. Never fabricate values. An empty string is always safer than a guess presented as fact.

Return ONLY a JSON object of the form: {"records": [ {..CRM fields..}, ... ]}
The "records" array MUST have exactly one entry per input source row, in the same order.
Do not include any commentary, markdown, or text outside the JSON object.`;

/**
 * Splits `rows` into batches, sends each batch to the LLM for field mapping,
 * validates/sanitizes the results, and aggregates success + skipped totals.
 *
 * @param {Record<string,string>[]} rows - raw parsed CSV rows
 * @param {(progress: {completed:number, total:number}) => void} [onProgress]
 */
async function extractCrmRecords(rows, onProgress) {
  if (!process.env.GEMINI_API_KEY) {
    throw new AiConfigError(
      'GEMINI_API_KEY is not set on the server. Add it to backend/.env before running an import.'
    );
  }

  const batches = chunk(rows, BATCH_SIZE);
  const imported = [];
  const skipped = [];
  const failedBatches = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    let batchResult = null;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        batchResult = await callModel(batch);
        break;
      } catch (err) {
        lastError = err;
        // simple linear backoff between retries
        if (attempt < MAX_RETRIES) await sleep(500 * (attempt + 1));
      }
    }

    if (!batchResult) {
      // Batch failed after all retries - record every row in it as skipped
      // rather than silently dropping data.
      failedBatches.push({ batchIndex: i, error: lastError?.message || 'Unknown AI error' });
      for (const row of batch) {
        skipped.push({ source: row, reason: `AI extraction failed: ${lastError?.message || 'unknown error'}` });
      }
    } else {
      for (let j = 0; j < batch.length; j++) {
        const candidate = batchResult[j];
        const { record, skip, reason } = sanitizeRecord(candidate);
        if (skip) {
          skipped.push({ source: batch[j], reason });
        } else {
          imported.push(record);
        }
      }
    }

    if (onProgress) onProgress({ completed: i + 1, total: batches.length });

    // Gemini's free tier is rate-limited per minute (not per request), so a
    // small pause between batches keeps us comfortably under that ceiling
    // instead of burning retries on 429s.
    if (i < batches.length - 1) await sleep(Number(process.env.AI_BATCH_DELAY_MS || 2000));
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    failedBatches,
  };
}

async function callModel(batch) {
  const userPrompt = `Source rows (JSON array, ${batch.length} rows):\n${JSON.stringify(batch)}`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(userPrompt);
  const content = result.response.text();
  if (!content) throw new Error('Empty response from model');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Model returned invalid JSON');
  }

  const records = parsed.records;
  if (!Array.isArray(records)) throw new Error('Model response missing "records" array');
  if (records.length !== batch.length) {
    throw new Error(`Expected ${batch.length} records, got ${records.length}`);
  }

  return records;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AiConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiConfigError';
    this.statusCode = 500;
  }
}

module.exports = { extractCrmRecords, AiConfigError };