import { Evidence } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  if (response.status === 204) return;
  return response.json();
};

export const evidenceService = {
  async createEvidence(
    data: Omit<Evidence, 'id' | 'importedBy' | 'importedAt'>
  ): Promise<Evidence> {
    const response = await fetch(`${API_URL}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getEvidenceById(id: string): Promise<Evidence | undefined> {
    const response = await fetch(`${API_URL}/evidence/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async getEvidenceByCaseId(caseId: string): Promise<Evidence[]> {
    const response = await fetch(`${API_URL}/evidence?caseId=${caseId}`);
    return handleResponse(response);
  },

  async getAllEvidence(): Promise<Evidence[]> {
    const response = await fetch(`${API_URL}/evidence`);
    return handleResponse(response);
  },

  async updateEvidence(
    id: string,
    updates: Partial<Omit<Evidence, 'id' | 'importedBy' | 'importedAt'>> & { observables?: any[] },
  ): Promise<Evidence> {
    const response = await fetch(`${API_URL}/evidence/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteEvidence(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/evidence/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },
};