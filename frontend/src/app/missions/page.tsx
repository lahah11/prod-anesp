'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusIcon, EyeIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { missionService } from '@/services/missionService';

const LIST_PERMISSIONS = [
  'mission_create',
  'mission_validate_technical',
  'mission_assign_logistics',
  'mission_validate_finance',
  'mission_validate_final'
];

type MissionStatus =
  | 'pending_technical_validation'
  | 'pending_logistics'
  | 'pending_finance'
  | 'pending_dg'
  | 'approved'
  | 'rejected';

interface Mission {
  id: number;
  reference: string;
  title: string;
  objective: string;
  start_date: string;
  end_date: string;
  status: MissionStatus;
  mission_type: 'terrestre' | 'aerienne';
  created_by_name: string;
}

function MissionsPageContent() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
  const router = useRouter();

  useEffect(() => {
    const loadMissions = async () => {
      try {
        const response = await missionService.getAll();
        setMissions(response || []);
      } catch (error: any) {
        console.error('Error loading missions:', error);
        if (error?.response?.status !== 403) {
          toast.error('Erreur lors du chargement des missions');
        }
        setMissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadMissions();
  }, []);

  const getStatusInfo = (status: MissionStatus) => {
    const map: Record<MissionStatus, { label: string; color: string; icon: typeof ClockIcon }> = {
      pending_technical_validation: { label: 'En attente validation technique', color: 'yellow', icon: ClockIcon },
      pending_logistics: { label: 'En attente attribution moyens', color: 'blue', icon: ClockIcon },
      pending_finance: { label: 'En attente validation financière', color: 'purple', icon: ClockIcon },
      pending_dg: { label: 'En attente validation DG', color: 'orange', icon: ClockIcon },
      approved: { label: 'Approuvée', color: 'green', icon: CheckCircleIcon },
      rejected: { label: 'Rejetée', color: 'red', icon: XCircleIcon }
    };
    return map[status];
  };

  const filteredMissions = missions.filter((mission) => {
    if (filter === 'pending') return mission.status.startsWith('pending');
    if (filter === 'validated') return mission.status === 'approved';
    if (filter === 'rejected') return mission.status === 'rejected';
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
            <p className="mt-2 text-gray-600">Gérez les missions et suivez leur progression dans le workflow de validation.</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/missions/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nouvelle mission
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toutes ({missions.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              En attente ({missions.filter((m) => m.status.startsWith('pending')).length})
            </button>
            <button
              onClick={() => setFilter('validated')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'validated' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Approuvées ({missions.filter((m) => m.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'rejected' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Rejetées ({missions.filter((m) => m.status === 'rejected').length})
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune mission</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'Commencez par créer votre première mission.' : 'Aucune mission ne correspond à ce filtre.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredMissions.map((mission) => {
                const statusInfo = getStatusInfo(mission.status);
                return (
                  <li key={mission.id} className="px-6">
                    <div className="flex items-center space-x-4 py-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 font-semibold">
                        {mission.reference.split('-').pop() || 'N/A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{mission.title || mission.objective}</p>
                        <p className="mt-1 text-sm text-gray-500">Référence: {mission.reference}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(mission.start_date).toLocaleDateString('fr-FR')} → {new Date(mission.end_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                          <statusInfo.icon className="h-4 w-4 mr-1" />
                          {statusInfo.label}
                        </div>
                        <p className="text-xs text-gray-500">Responsable: {mission.created_by_name || 'N/A'}</p>
                        <Link
                          href={`/missions/${mission.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Voir détails
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MissionsPage() {
  return (
    <ProtectedRoute requiredPermissions={LIST_PERMISSIONS} permissionMatch="any">
      <MissionsPageContent />
    </ProtectedRoute>
  );
}
