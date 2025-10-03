import { Observable } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  if (response.status === 204) return [];
  return response.json();
};

export const observableService = {
  async getAllObservables(): Promise<Observable[]> {
    const response = await fetch(`${API_URL}/observables`);
    return handleResponse(response);
  },

  async deleteObservable(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/observables/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },
};