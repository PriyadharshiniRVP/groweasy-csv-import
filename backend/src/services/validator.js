const { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, CRM_FIELDS } = require('../config/constants');

/**
 * Takes one AI-produced candidate record and enforces every hard rule from
 * the spec that we don't trust the model to get right 100% of the time.
 * Returns { record, skip, reason }.
 *
 * This is a deliberate belt-and-suspenders layer: the prompt asks the model
 * to follow these rules, but production systems shouldn't trust LLM output
 * blindly for anything that has a hard business constraint.
 */
function sanitizeRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    return { record: null, skip: true, reason: 'AI returned a non-object record' };
  }

  const record = {};
  for (const field of CRM_FIELDS) {
    const value = raw[field];
    record[field] = value === undefined || value === null ? '' : String(value).trim();
  }

  // Rule: skip records with neither email nor mobile number.
  const hasEmail = record.email && record.email.includes('@');
  const hasMobile = record.mobile_without_country_code && /\d/.test(record.mobile_without_country_code);
  if (!hasEmail && !hasMobile) {
    return { record, skip: true, reason: 'No valid email or mobile number found' };
  }

  // Rule: crm_status must be one of the allowed enum values, else blank.
  if (record.crm_status && !CRM_STATUS_VALUES.includes(record.crm_status)) {
    record.crm_note = appendNote(record.crm_note, `Original status: ${record.crm_status}`);
    record.crm_status = '';
  }

  // Rule: if the AI left country_code blank but the mobile number is a clean
  // 10-digit Indian mobile pattern (starts 6-9, no leading country code left
  // in the digits), default to +91 deterministically instead of leaving this
  // to the model's judgment call, which isn't perfectly consistent run to run.
  if (!record.country_code && /^[6-9]\d{9}$/.test(record.mobile_without_country_code)) {
    record.country_code = '+91';
  }

  // Rule: data_source must be one of the allowed enum values, else blank.
  if (record.data_source && !DATA_SOURCE_VALUES.includes(record.data_source)) {
    record.data_source = '';
  }

  // Rule: created_at must be parseable by `new Date(...)`. If not, blank it
  // out rather than shipping a value that breaks downstream CRM code.
  if (record.created_at) {
    const parsed = new Date(record.created_at);
    if (Number.isNaN(parsed.getTime())) {
      record.crm_note = appendNote(record.crm_note, `Unparsed date: ${record.created_at}`);
      record.created_at = '';
    }
  }

  // Rule: CSV-safety - collapse stray newlines inside any field.
  for (const field of CRM_FIELDS) {
    if (typeof record[field] === 'string' && record[field].includes('\n')) {
      record[field] = record[field].replace(/\r?\n/g, '\\n');
    }
  }

  return { record, skip: false, reason: null };
}

function appendNote(existingNote, addition) {
  if (!existingNote) return addition;
  return `${existingNote}; ${addition}`;
}

module.exports = { sanitizeRecord };