// Fixed vocabulary the AI extraction must respect. Keeping these centralized
// means the prompt, the post-processing validator, and any future admin UI
// all read from a single source of truth.

const CRM_STATUS_VALUES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
];

const DATA_SOURCE_VALUES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
];

// The canonical CRM field order. Also used to guarantee every returned
// record has a consistent shape even when the AI omits a field.
const CRM_FIELDS = [
  'created_at',
  'name',
  'email',
  'country_code',
  'mobile_without_country_code',
  'company',
  'city',
  'state',
  'country',
  'lead_owner',
  'crm_status',
  'crm_note',
  'data_source',
  'possession_time',
  'description',
];

// How many source rows we send to the LLM per request. Small enough to keep
// prompts fast and reliable, large enough to avoid excessive round trips.
const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 20);

// Batches are retried this many times before being marked as failed.
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 2);

module.exports = {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  CRM_FIELDS,
  BATCH_SIZE,
  MAX_RETRIES,
};
