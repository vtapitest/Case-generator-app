import { Source } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  if (response.status === 204) return;
  return response.json();
};

export const sourceService = {
  async createSource(
    data: Omit<Source, 'id'>
  ): Promise<Source> {
    const response = await fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getSourceById(id: string): Promise<Source | undefined> {
    const response = await fetch(`${API_URL}/sources/${id}`);
    if (response.status === 404) return undefined;
    return handleResponse(response);
  },

  async getAllSources(): Promise<Source[]> {
    const response = await fetch(`${API_URL}/sources`);
    return handleResponse(response);
  },

  async updateSource(
    id: string,
    updates: Partial<Omit<Source, 'id'>>,
  ): Promise<Source> {
    const response = await fetch(`${API_URL}/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteSource(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/sources/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },
};