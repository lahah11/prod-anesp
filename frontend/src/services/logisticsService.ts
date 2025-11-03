import api from './api';
import { missionService, LogisticsPayload } from './missionService';

export type Vehicle = {
  id: number;
  label: string;
  registration: string;
  fuel_type?: string;
  status: string;
};

export type Driver = {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  status: string;
};

async function listVehicles(): Promise<Vehicle[]> {
  const response = await api.get<Vehicle[]>('/resources/vehicles');
  return response.data;
}

async function listDrivers(): Promise<Driver[]> {
  const response = await api.get<Driver[]>('/resources/drivers');
  return response.data;
}

async function assignLogistics(missionId: string, payload: LogisticsPayload) {
  return missionService.submitWorkflowAction(missionId, 'logistics', 'approve', {
    logistics: payload
  });
}

export default {
  listVehicles,
  listDrivers,
  assignLogistics
};