'use client';

import { useAuth } from '@/app/providers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PowerIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type NavigationItem = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles?: string[];
  permissions?: string[];
  permissionMatch?: 'all' | 'any';
};

const navigation: NavigationItem[] = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: HomeIcon
  },
  {
    name: 'Missions',
    href: '/missions',
    icon: DocumentTextIcon,
    permissions: [
      'mission_create',
      'mission_validate_technical',
      'mission_assign_logistics',
      'mission_validate_finance',
      'mission_validate_final'
    ],
    permissionMatch: 'any'
  },
  {
    name: 'Nouvelle mission',
    href: '/missions/create',
    icon: PencilSquareIcon,
    permissions: ['mission_create']
  },
  {
    name: 'Ressources humaines',
    href: '/users',
    icon: UsersIcon,
    permissions: ['user_admin_rh']
  }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const userPermissions = user.permissions || [];

  const filteredNavigation = navigation.filter((item) => {
    const roleAllowed = !item.roles || item.roles.includes(user.role);
    if (!roleAllowed) {
      return false;
    }
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }
    if (user.role === 'super_admin') {
      return true;
    }
    if (item.permissionMatch === 'any') {
      return item.permissions.some((code) => userPermissions.includes(code));
    }
    return item.permissions.every((code) => userPermissions.includes(code));
  });

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-5 bg-mauritania-green overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="h-15 w-15 bg-mauritania-green rounded-full flex items-center justify-center p-1">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
              <div className="ml-3">
                <h1 className="text-white font-bold text-lg">SOM</h1>
                <p className="text-mauritania-yellow text-xs">Système d'Ordre de Mission</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-6 px-4">
            <div className="bg-mauritania-green-dark rounded-lg p-3">
              <p className="text-white font-medium text-sm">
                {`${user.first_name} ${user.last_name}`}
              </p>
              <p className="text-mauritania-yellow text-xs capitalize">{user.role.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive
                      ? 'bg-mauritania-green-dark text-white'
                      : 'text-gray-300 hover:bg-mauritania-green-dark hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                      'mr-3 flex-shrink-0 h-5 w-5'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="flex-shrink-0 p-4">
            <button
              onClick={logout}
              className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors duration-150"
            >
              <PowerIcon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-white" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}