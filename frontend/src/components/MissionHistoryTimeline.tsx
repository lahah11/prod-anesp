'use client';

import { t, useI18n } from '@/lib/i18n';

type HistoryItem = {
  status: string;
  action: string;
  comment?: string;
  user?: string;
  role?: string;
  at: string;
};

type Props = { history: HistoryItem[] };

const STATUS_LABELS: Record<string, { fr: string; ar: string }> = {
  pending_technical_validation: { fr: 'Soumission par l’ingénieur', ar: 'إرسال من طرف المهندس' },
  pending_logistics: { fr: 'Validation technique', ar: 'اعتماد تقني' },
  pending_finance: { fr: 'Affectation logistique', ar: 'تعيين اللوجستيك' },
  pending_dg: { fr: 'Validation financière', ar: 'اعتماد مالي' },
  approved: { fr: 'Validation DG', ar: 'اعتماد المدير العام' },
  rejected: { fr: 'Rejet', ar: 'رفض' }
};

export default function MissionHistoryTimeline({ history }: Props) {
  const { language } = useI18n();
  if (!history?.length) {
    return <p className="text-sm text-slate-500">{t('Aucun événement enregistré.', 'لا توجد أحداث مسجلة.', language)}</p>;
  }
  return (
    <ol className="relative border-s border-slate-200 pl-6">
      {history.map((item, index) => (
        <li key={`${item.status}-${item.at}-${index}`} className="mb-6">
          <span className="absolute -left-3 mt-1 h-3 w-3 rounded-full bg-sky-500" />
          <h4 className="font-semibold text-slate-800">
            {STATUS_LABELS[item.status]?.[language] || item.status}
          </h4>
          <p className="text-sm text-slate-500">
            {new Date(item.at).toLocaleString()} — {item.user}
          </p>
          {item.comment && <p className="mt-1 text-sm text-slate-600">{item.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
