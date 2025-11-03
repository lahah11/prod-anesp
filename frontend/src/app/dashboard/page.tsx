'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/app/providers';
import { missionService } from '@/services/missionService';
import { userService } from '@/services/userService';

type MissionStatus =
  | 'pending_technical_validation'
  | 'pending_logistics'
  | 'pending_finance'
  | 'pending_dg'
  | 'approved'
  | 'rejected';

interface MissionRow {
  id: number;
  reference: string;
  title: string;
  status: MissionStatus;
  mission_type: 'terrestre' | 'aerienne';
  start_date: string;
  end_date: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load missions (available to all authenticated users)
        const missionData = await missionService.getAll();
        setMissions(missionData || []);
        
        // Only load users if user has RH permissions
        const hasRHPermission = user?.role === 'rh' || user?.role === 'super_admin';
        if (hasRHPermission) {
          try {
            const usersData = await userService.list({ pageSize: 1 });
            setUsersCount(usersData?.total ?? usersData?.data?.length ?? 0);
          } catch (error) {
            // Silently fail if user doesn't have permission
            setUsersCount(0);
          }
        } else {
          setUsersCount(0);
        }
        
        setDashboardError('');
      } catch (error) {
        console.error('Dashboard load error', error);
        toast.error('Impossible de charger le tableau de bord');
        setDashboardError("Certaines données n'ont pas pu être chargées");
        setMissions([]);
        setUsersCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = missions.filter((mission) => mission.status.startsWith('pending')).length;
  const approvedCount = missions.filter((mission) => mission.status === 'approved').length;
  const rejectedCount = missions.filter((mission) => mission.status === 'rejected').length;

  const recentMissions = missions.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue {user?.first_name}</h1>
          <p className="text-gray-600">Synthèse des missions et activités récentes</p>
        </div>

        {dashboardError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {dashboardError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
            <ClockIcon className="h-10 w-10 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500">Missions en attente</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Missions approuvées</p>
              <p className="text-2xl font-semibold text-gray-900">{approvedCount}</p>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
            <XCircleIcon className="h-10 w-10 text-red-500" />
            <div>
              <p className="text-sm text-gray-500">Missions rejetées</p>
              <p className="text-2xl font-semibold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" /> Missions récentes
              </h2>
              <Link href="/missions" className="text-sm text-blue-600 hover:text-blue-500">
                Voir toutes les missions
              </Link>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentMissions.map((mission) => (
                <li key={mission.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{mission.title || mission.reference}</p>
                      <p className="text-xs text-gray-500">{mission.reference}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        mission.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : mission.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {mission.status.replace('pending_', 'en attente ')}
                    </span>
                  </div>
                </li>
              ))}
              {!recentMissions.length && (
                <li className="py-6 text-center text-sm text-gray-500">Aucune mission disponible</li>
              )}
            </ul>
          </div>

          {(user?.role === 'rh' || user?.role === 'super_admin') && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2" /> Personnel enregistré
                </h2>
                <Link href="/users" className="text-sm text-blue-600 hover:text-blue-500">
                  Gérer les utilisateurs
                </Link>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{usersCount}</p>
              <p className="text-sm text-gray-500 mt-2">Agents disponibles dans la plateforme</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
