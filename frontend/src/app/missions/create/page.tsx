'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import MissionForm from '@/components/MissionForm';

export default function CreateMissionPage() {
  return (
    <ProtectedRoute requiredPermissions={['mission_create']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Link href="/missions" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouvelle mission</h1>
              <p className="text-gray-600">Complétez le formulaire pour soumettre une mission</p>
            </div>
          </div>
          <MissionForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
