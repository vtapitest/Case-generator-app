import { Case, CaseStatus } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  if (response.status === 204) return;
  return response.json();
};

export const caseService = {
  async createCase(
    data: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Case> {
    const response = await fetch(`${API_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getCaseById(id: string): Promise<Case | undefined> {
    const response = await fetch(`${API_URL}/cases/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async getAllCases(): Promise<Case[]> {
    const response = await fetch(`${API_URL}/cases`);
    return handleResponse(response);
  },

  async updateCase(
    id: string,
    updates: Partial<Omit<Case, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Case> {
    const response = await fetch(`${API_URL}/cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteCase(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/cases/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },
};