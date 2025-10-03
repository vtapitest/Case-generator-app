import { AuditLog } from '@/types';

const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  return response.json();
};

export const auditLogService = {
  async getLogs(limit = 50): Promise<AuditLog[]> {
    const response = await fetch(`${API_URL}/audit-logs?limit=${limit}`);
    return handleResponse(response);
  },

  async getLogsByCase(caseId: string, limit = 50): Promise<AuditLog[]> {
    const response = await fetch(`${API_URL}/audit-logs?caseId=${caseId}&limit=${limit}`);
    return handleResponse(response);
  },
};