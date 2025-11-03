'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/app/providers';
import { userService, CreateUserData, UpdateUserData } from '@/services/userService';

interface UserRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  grade?: string;
  direction?: string;
  role_code: string;
  status: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  ingenieur: 'Ingénieur',
  technique: 'Technique',
  moyens_generaux: 'Moyens Généraux',
  daf: 'DAF',
  dg: 'DG',
  rh: 'Ressources humaines'
};

function UsersContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    grade: '',
    direction: '',
    role: 'ingenieur',
    status: 'available'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.list({ search });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users', error);
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingUser) {
        const payload: UpdateUserData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          grade: formData.grade,
          direction: formData.direction,
          role: formData.role,
          status: formData.status
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await userService.update(editingUser.id, payload);
        toast.success('Utilisateur mis à jour');
      } else {
        await userService.create(formData);
        toast.success('Utilisateur créé');
      }
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        grade: '',
        direction: '',
        role: 'ingenieur',
        status: 'available'
      });
      setEditingUser(null);
      setShowForm(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Save user error', error);
      toast.error(error?.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const startEdit = (row: UserRow) => {
    setEditingUser(row);
    setFormData({
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      password: '',
      grade: row.grade || '',
      direction: row.direction || '',
      role: row.role_code,
      status: row.status
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      grade: '',
      direction: '',
      role: 'ingenieur',
      status: 'available'
    });
    setShowForm(false);
  };

  if (user?.role !== 'super_admin' && user?.role !== 'rh') {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <p className="text-gray-600">Accès réservé aux administrateurs RH.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-600">Gestion des comptes et disponibilités</p>
          </div>
          <div className="flex space-x-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={loadUsers}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Rechercher
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Nouvel utilisateur
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prénom</label>
                <input
                  value={formData.first_name}
                  onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom</label>
                <input
                  value={formData.last_name}
                  onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  placeholder={editingUser ? 'Laisser vide pour ne pas changer' : ''}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade</label>
                <input
                  value={formData.grade}
                  onChange={(event) => setFormData({ ...formData, grade: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Direction</label>
                <input
                  value={formData.direction}
                  onChange={(event) => setFormData({ ...formData, direction: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {Object.entries(ROLE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Statut</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="available">Disponible</option>
                  <option value="in_mission">En mission</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={cancelForm} className="px-4 py-2 border border-gray-300 rounded-md">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {editingUser ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ROLE_LABELS[row.role_code] || row.role_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {row.status === 'available' ? 'Disponible' : 'En mission'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => startEdit(row)}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredPermissions={['user_admin_rh']}>
      <UsersContent />
    </ProtectedRoute>
  );
}
