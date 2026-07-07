import type { ImportResult } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {}

/**
 * Sends the original CSV file to the backend for AI-powered CRM mapping.
 * The backend re-parses the file itself (it doesn't trust the client's
 * parse), batches the rows, and calls the LLM.
 */
export async function importCsv(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let message = `Import failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    throw new ApiError(message);
  }

  return response.json();
}
