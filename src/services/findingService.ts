import { Finding } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  if (response.status === 204) return;
  return response.json();
};

export const findingService = {
  async createFinding(
    data: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Finding> {
    const response = await fetch(`${API_URL}/findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getFindingById(id: string): Promise<Finding | undefined> {
    const response = await fetch(`${API_URL}/findings/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async getFindingsByCaseId(caseId: string): Promise<Finding[]> {
    const response = await fetch(`${API_URL}/findings?caseId=${caseId}`);
    return handleResponse(response);
  },

  async getAllFindings(): Promise<Finding[]> {
    const response = await fetch(`${API_URL}/findings`);
    return handleResponse(response);
  },

  async updateFinding(
    id: string,
    updates: Partial<Omit<Finding, 'id' | 'createdAt' | 'updatedAt' | 'caseId' | 'tags'>>,
  ): Promise<Finding> {
    const response = await fetch(`${API_URL}/findings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteFinding(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/findings/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },
};