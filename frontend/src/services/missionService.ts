import api from './api';

export type MissionFilters = {
  status?: string;
  search?: string;
};

export type WorkflowDecision = 'approve' | 'reject';
export type WorkflowStep = 'technical' | 'logistics' | 'finance' | 'dg';

export interface WorkflowResponse {
  message: string;
  mission?: any;
}

export interface LogisticsPayload {
  vehicle_id?: string | number;
  driver_id?: string | number;
  fuel_amount?: number;
  lodging_details?: string;
  tickets_details?: string;
  local_transport?: string;
  notes?: string;
}

function buildNoCacheHeaders(noCache?: boolean) {
  if (!noCache) return undefined;
  return { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' };
}

export const missionService = {
  async create(data: any) {
    const response = await api.post('/missions', data);
    return response.data;
  },

  async getAll(filters: MissionFilters = {}) {
    const response = await api.get('/missions', { params: filters });
    return response.data;
  },

  async getById(id: string, opts?: { noCache?: boolean }) {
    const response = await api.get(`/missions/${id}`, {
      headers: buildNoCacheHeaders(opts?.noCache)
    });
    return response.data;
  },

  async getAvailableAgents() {
    const response = await api.get('/missions/available/internal-agents');
    return response.data;
  },

  async submitWorkflowAction(
    id: string,
    step: WorkflowStep,
    decision: WorkflowDecision,
    options: { comment?: string; logistics?: LogisticsPayload } = {}
  ) {
    const response = await api.post(`/missions/${id}/validate`, {
      step,
      decision,
      comment: options.comment,
      logistics: options.logistics
    });
    return response.data as WorkflowResponse;
  }
};