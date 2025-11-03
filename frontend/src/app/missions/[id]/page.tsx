'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import LogisticsAssignment from '@/components/LogisticsAssignment';
import DocumentUpload from '@/components/DocumentUpload';
import MissionHistoryTimeline from '@/components/MissionHistoryTimeline';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/providers';
import { missionService, WorkflowResponse } from '@/services/missionService';

interface MissionParticipant {
  id: number;
  participant_type: 'internal' | 'external';
  first_name?: string;
  last_name?: string;
  nni?: string;
  profession?: string;
  ministry?: string;
  user_id?: number;
  internal_name?: string;
  internal_email?: string;
  internal_grade?: string;
}

interface MissionDetails {
  id: number;
  reference: string;
  title: string;
  objective: string;
  mission_type: 'terrestre' | 'aerienne';
  start_date: string;
  end_date: string;
  status: MissionStatus;
  departure_city: string;
  transport_mode: string;
  total_distance_km: number;
  fuel_estimate: number;
  per_diem_total: number;
  destinations: { city: string; distance_km: number }[];
  participants: MissionParticipant[];
  documents: any[];
  validation_history: any[];
  logistics?: {
    vehicle_id?: number;
    driver_id?: number;
    fuel_amount?: number;
    lodging_details?: string;
    tickets_details?: string;
    local_transport?: string;
    notes?: string;
    vehicle_label?: string;
    registration?: string;
    driver_first_name?: string;
    driver_last_name?: string;
  } | null;
}

type MissionStatus =
  | 'pending_technical_validation'
  | 'pending_logistics'
  | 'pending_finance'
  | 'pending_dg'
  | 'approved'
  | 'rejected';

type WorkflowStep = 'technical' | 'logistics' | 'finance' | 'dg';

const STATUS_ORDER: MissionStatus[] = [
  'pending_technical_validation',
  'pending_logistics',
  'pending_finance',
  'pending_dg',
  'approved'
];

const PERMISSION_BY_STATUS: Record<MissionStatus, string | null> = {
  pending_technical_validation: 'mission_validate_technical',
  pending_logistics: 'mission_assign_logistics',
  pending_finance: 'mission_validate_finance',
  pending_dg: 'mission_validate_final',
  approved: null,
  rejected: null
};

function getCurrentStep(status: MissionStatus): number {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? 0 : index + 1;
}

const STEP_DEFINITIONS = [
  { id: 1, name: 'Validation technique', role: 'technique', icon: ShieldCheckIcon },
  { id: 2, name: 'Attribution moyens', role: 'moyens_generaux', icon: TruckIcon },
  { id: 3, name: 'Validation financière', role: 'daf', icon: CurrencyDollarIcon },
  { id: 4, name: 'Validation finale DG', role: 'dg', icon: CheckCircleIcon }
];

function MissionDetailContent({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [mission, setMission] = useState<MissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const loadMission = async () => {
      try {
        const data = await missionService.getById(params.id, { noCache: true });
        setMission(data);
      } catch (error) {
        console.error('Error loading mission', error);
        toast.error('Mission introuvable');
      } finally {
        setLoading(false);
      }
    };

    loadMission();
  }, [params.id]);

  const refresh = async () => {
    const data = await missionService.getById(params.id, { noCache: true });
    setMission(data);
  };

  const currentStep = mission ? getCurrentStep(mission.status) : 0;

  const canAct = useMemo(() => {
    if (!user || !mission) return false;
    if (mission.status === 'approved' || mission.status === 'rejected') return false;
    if (user.role === 'super_admin') return true;
    const requiredPermission = PERMISSION_BY_STATUS[mission.status];
    if (!requiredPermission) return false;
    return user.permissions?.includes(requiredPermission) ?? false;
  }, [mission, user]);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!mission) return;
    if (decision === 'reject' && !comment.trim()) {
      toast.error('Un motif est obligatoire pour un rejet');
      return;
    }
    const status = mission.status;
    let step: WorkflowStep;
    if (status === 'pending_technical_validation') step = 'technical';
    else if (status === 'pending_logistics') step = 'logistics';
    else if (status === 'pending_finance') step = 'finance';
    else step = 'dg';

    setSubmitting(true);
    setActionError('');
    try {
      const result: WorkflowResponse = await missionService.submitWorkflowAction(params.id, step, decision, {
        comment: comment.trim() || undefined
      });
      toast.success(result?.message || (decision === 'approve' ? 'Action enregistrée' : 'Mission rejetée'));
      setComment('');
      if (result?.mission) {
        setMission(result.mission);
      } else {
        await refresh();
      }
    } catch (error: any) {
      console.error('Workflow error', error);
      const message = error?.response?.data?.message || 'Erreur lors de la validation';
      setActionError(message);
      toast.error(message);
      const failedMission = error?.response?.data?.mission;
      if (failedMission) {
        setMission(failedMission);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!mission) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Mission introuvable</h2>
          <Link href="/missions" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour aux missions
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const stepCards = STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    completed: currentStep > index + 1,
    current: currentStep === index + 1,
    statusReached: currentStep >= index + 1
  }));

  const hasLogisticsPermission = user?.role === 'super_admin' || user?.permissions?.includes('mission_assign_logistics');
  const hasDocumentUploadPermission = user?.role === 'super_admin' || user?.permissions?.includes('mission_create');

  const showLogisticsForm = mission.status === 'pending_logistics' && hasLogisticsPermission;
  const showDocumentUpload = mission.status === 'approved' && hasDocumentUploadPermission;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/missions" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{mission.reference}</h1>
            <p className="text-gray-600">{mission.title || mission.objective}</p>
          </div>
          {canAct && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleDecision('approve')}
                disabled={submitting || showLogisticsForm}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Valider
              </button>
              <button
                onClick={() => handleDecision('reject')}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                Rejeter
              </button>
            </div>
          )}
        </div>

        {canAct && (
          <div className="bg-white shadow rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Ajouter un commentaire ou le motif du rejet"
            />
            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow de validation</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {stepCards.map((step, stepIdx) => {
                const StepIcon = step.icon;
                return (
                  <li key={step.id}>
                    <div className="relative pb-8">
                      {stepIdx !== stepCards.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              step.completed
                                ? 'bg-green-500 text-white'
                                : step.current
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-300 text-gray-500'
                            }`}
                          >
                            <StepIcon className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className={`text-sm font-medium ${step.statusReached ? 'text-gray-900' : 'text-gray-500'}`}>
                              {step.name}
                            </p>
                            <p className="text-sm text-gray-500">{step.role.toUpperCase()}</p>
                          </div>
                          {step.completed && (
                            <div className="text-right text-sm whitespace-nowrap text-green-600">
                              <CheckCircleIcon className="h-4 w-4 inline mr-1" /> Terminé
                            </div>
                          )}
                          {step.current && (
                            <div className="text-right text-sm whitespace-nowrap text-blue-600">
                              <ClockIcon className="h-4 w-4 inline mr-1" /> En cours
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" /> Participants
            </h2>
            <ul className="space-y-2">
              {mission.participants.map((participant) => (
                <li key={participant.id} className="flex justify-between text-sm">
                  <span>
                    {participant.participant_type === 'internal'
                      ? participant.internal_name
                      : `${participant.first_name} ${participant.last_name}`}
                  </span>
                  <span className="text-gray-500">
                    {participant.participant_type === 'internal'
                      ? participant.internal_grade
                      : participant.profession}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Itinéraire</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {mission.destinations.map((destination, index) => (
                <li key={`${destination.city}-${index}`}>
                  {index + 1}. {destination.city} — {destination.distance_km} km
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              Distance totale: {mission.total_distance_km} km — Estimation carburant: {mission.fuel_estimate} L
            </p>
          </div>
        </div>

        {showLogisticsForm && (
          <LogisticsAssignment missionId={params.id} missionType={mission.mission_type} onAssignmentComplete={refresh} />
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
          <MissionHistoryTimeline history={mission.validation_history || []} />
        </div>

        {showDocumentUpload && (
          <DocumentUpload missionId={params.id} onUploadComplete={refresh} />
        )}
      </div>
    </DashboardLayout>
  );
}

const VIEW_PERMISSIONS = [
  'mission_create',
  'mission_validate_technical',
  'mission_assign_logistics',
  'mission_validate_finance',
  'mission_validate_final'
];

export default function MissionDetailPage(props: { params: { id: string } }) {
  return (
    <ProtectedRoute requiredPermissions={VIEW_PERMISSIONS} permissionMatch="any">
      <MissionDetailContent {...props} />
    </ProtectedRoute>
  );
}
