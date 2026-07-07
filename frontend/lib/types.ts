export type Step = 'upload' | 'preview' | 'processing' | 'results';

export interface ParsedPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface CrmRecord {
  [key: string]: string;
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  source: Record<string, string>;
  reason: string;
}

export interface ImportResult {
  headers: string[];
  totalSourceRows: number;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  failedBatches?: { batchIndex: number; error: string }[];
}

export const CRM_FIELD_ORDER: (keyof CrmRecord)[] = [
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