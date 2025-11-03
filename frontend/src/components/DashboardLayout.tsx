'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useI18n, t } from '@/lib/i18n';

const NAV_ITEMS = [
  { href: '/dashboard', labelFr: 'Tableau de bord', labelAr: 'لوحة التحكم', roles: ['super_admin', 'dg', 'daf', 'moyens_generaux', 'technique', 'rh', 'ingenieur'] },
  { href: '/missions', labelFr: 'Missions', labelAr: 'المهام', roles: ['super_admin', 'dg', 'daf', 'moyens_generaux', 'technique', 'ingenieur'] },
  { href: '/missions/create', labelFr: 'Nouvelle mission', labelAr: 'إنشاء مهمة', roles: ['ingenieur'] },
  { href: '/users', labelFr: 'Ressources humaines', labelAr: 'الموارد البشرية', roles: ['rh', 'super_admin'] }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, toggle } = useI18n();

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-72 bg-white shadow-md">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">ANESP</h2>
            <p className="text-xs text-slate-500">{user.first_name} {user.last_name}</p>
          </div>
          <button className="text-xs text-slate-500" onClick={toggle}>
            {language === 'fr' ? 'AR' : 'FR'}
          </button>
        </div>
        <nav className="mt-4 space-y-1 px-4">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(item.labelFr, item.labelAr, language)}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="mx-4 mt-8 w-full rounded-md bg-slate-900 py-2 text-sm text-white">
          {t('Déconnexion', 'تسجيل الخروج', language)}
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
