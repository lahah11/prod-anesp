'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api-client';
import { useI18n, t } from '@/lib/i18n';
import { getCitiesSorted, findCityByName, calculateDistance, MAURITANIA_CITIES } from '@/utils/mauritania-cities';
import { useAuth } from '@/app/providers';

const FUEL_CONSUMPTION = 0.08;

const GRADE_RATE: Record<string, number> = {
  A: 3500,
  B: 3000,
  C: 2500,
  D: 2000
};

const DEFAULT_RATE = 1500;
const EXTERNAL_RATE = 1800;

type Destination = { city: string; distance_km: number };
type Participant = {
  participant_type: 'internal' | 'external';
  user_id?: number;
  first_name?: string;
  last_name?: string;
  nni?: string;
  profession?: string;
  ministry?: string;
  grade?: string;
};

type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  grade?: string;
  direction?: string;
};

type MissionPayload = {
  title: string;
  mission_type: 'terrestre' | 'aerienne';
  objective: string;
  start_date: string;
  end_date: string;
  departure_city: string;
  transport_mode: string;
  destinations: Destination[];
  participants: Participant[];
  fuel_amount?: number;
  mission_fees?: number;
};

export default function MissionForm() {
  const { language } = useI18n();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [cities] = useState(() => getCitiesSorted());
  const [payload, setPayload] = useState<MissionPayload>({
    title: '',
    mission_type: 'terrestre',
    objective: '',
    start_date: '',
    end_date: '',
    departure_city: 'Nouakchott',
    transport_mode: 'voiture ANESP',
    destinations: [{ city: '', distance_km: 0 }],
    participants: [],
    fuel_amount: 0,
    mission_fees: 0
  });

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data } = await api.get('/missions/available/internal-agents');
        setEmployees(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadEmployees();
  }, []);

  const employeesMap = useMemo(() => {
    const map = new Map<number, Employee>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  const totalDistance = useMemo(
    () =>
      payload.destinations.reduce((accumulator, destination) => accumulator + Number(destination.distance_km || 0), 0),
    [payload.destinations]
  );

  const durationDays = useMemo(() => {
    if (!payload.start_date || !payload.end_date) return 0;
    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [payload.start_date, payload.end_date]);

  const fuelEstimate = useMemo(() => {
    if (payload.mission_type === 'aerienne') return 0;
    return Number((totalDistance * FUEL_CONSUMPTION).toFixed(2));
  }, [payload.mission_type, totalDistance]);

  const perDiemEstimate = useMemo(() => {
    if (!durationDays) return 0;
    return payload.participants.reduce((total, participant) => {
      if (participant.participant_type === 'internal' && participant.user_id) {
        const grade = employeesMap.get(participant.user_id)?.grade?.[0]?.toUpperCase() || '';
        const rate = GRADE_RATE[grade] || DEFAULT_RATE;
        return total + rate * durationDays;
      }
      const grade = participant.grade?.[0]?.toUpperCase() || '';
      const rate = GRADE_RATE[grade] || EXTERNAL_RATE;
      return total + rate * durationDays;
    }, 0);
  }, [payload.participants, durationDays, employeesMap]);

  const updateDestination = (index: number, key: keyof Destination, value: string) => {
    setPayload((prev) => {
      const destinations = [...prev.destinations];
      const destination = { ...destinations[index] };
      
      if (key === 'city') {
        destination.city = value;
        // Calcul automatique de la distance depuis Nouakchott
        const selectedCity = findCityByName(value);
        if (selectedCity) {
          destination.distance_km = selectedCity.distance;
        }
      } else if (key === 'distance_km') {
        destination.distance_km = Number(value);
      }
      
      destinations[index] = destination as Destination;
      return { ...prev, destinations };
    });
  };

  const addDestination = () => {
    setPayload((prev) => ({
      ...prev,
      destinations: [...prev.destinations, { city: '', distance_km: 0 }]
    }));
  };

  const removeDestination = (index: number) => {
    setPayload((prev) => ({
      ...prev,
      destinations: prev.destinations.filter((_, idx) => idx !== index)
    }));
  };

  const addInternalParticipant = () => {
    setPayload((prev) => ({
      ...prev,
      participants: [...prev.participants, { participant_type: 'internal', user_id: undefined }]
    }));
  };

  const addExternalParticipant = () => {
    setPayload((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        { participant_type: 'external', first_name: '', last_name: '', profession: '', ministry: '' }
      ]
    }));
  };

  const removeParticipant = (index: number) => {
    setPayload((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const destinations = (payload.destinations || [])
        .map((destination) => ({
          city: destination.city.trim(),
          distance_km: Number(destination.distance_km || 0)
        }))
        .filter((destination) => destination.city && destination.distance_km >= 0);

      const participants = (payload.participants || [])
        .map((participant) => {
          if (participant.participant_type === 'internal') {
            return {
              participant_type: 'internal' as const,
              user_id: participant.user_id ? Number(participant.user_id) : undefined
            };
          }
          return {
            participant_type: 'external' as const,
            first_name: participant.first_name?.trim() || '',
            last_name: participant.last_name?.trim() || '',
            nni: participant.nni?.trim() || '',
            profession: participant.profession?.trim() || '',
            ministry: participant.ministry?.trim() || '',
            grade: participant.grade?.trim() || ''
          };
        })
        .filter((participant) => {
          if (participant.participant_type === 'internal') {
            return Boolean(participant.user_id);
          }
          return Boolean(participant.first_name && participant.last_name);
        });

      if (!destinations.length) {
        setMessage('Au moins une destination est requise');
        setSubmitting(false);
        return;
      }

      if (!participants.length) {
        setMessage('Ajoutez au moins un participant');
        setSubmitting(false);
        return;
      }

      const missionPayload = {
        ...payload,
        title: payload.title.trim(),
        objective: payload.objective.trim(),
        departure_city: payload.departure_city.trim(),
        transport_mode: payload.transport_mode.trim(),
        destinations,
        participants,
        fuel_amount: payload.fuel_amount || 0,
        mission_fees: payload.mission_fees || 0
      };

      const { data } = await api.post('/missions', missionPayload);
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', 'justificatif');
        formData.append('title', file.name);
        await api.post(`/documents/${data.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setMessage(
        t(
          `Mission créée avec la référence ${data.reference}`,
          `تم إنشاء المهمة بالمرجع ${data.reference}`,
          language
        )
      );
      setPayload({
        title: '',
        mission_type: 'terrestre',
        objective: '',
        start_date: '',
        end_date: '',
        departure_city: 'Nouakchott',
        transport_mode: 'voiture ANESP',
        destinations: [{ city: '', distance_km: 0 }],
        participants: [],
        fuel_amount: 0,
        mission_fees: 0
      });
      setAttachments([]);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">{t('Informations générales', 'المعلومات العامة', language)}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">{t('Objet de la mission', 'موضوع المهمة', language)}</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.title}
              onChange={(e) => setPayload((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t('Type', 'النوع', language)}</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.mission_type}
              onChange={(e) =>
                setPayload((prev) => ({ ...prev, mission_type: e.target.value as MissionPayload['mission_type'] }))
              }
            >
              <option value="terrestre">{t('Terrestre', 'بري', language)}</option>
              <option value="aerienne">{t('Aérienne', 'جوي', language)}</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">{t('Ville de départ', 'مدينة الانطلاق', language)}</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.departure_city}
              onChange={(e) => setPayload((prev) => ({ ...prev, departure_city: e.target.value }))}
              required
            >
              {cities.map((city, idx) => (
                <option key={`${city.name}-${city.region}-${idx}`} value={city.name}>
                  {language === 'ar' ? city.nameAr : city.name} {city.region !== 'Nouakchott' ? `(${city.region})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">{t('Moyen de transport', 'وسيلة النقل', language)}</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.transport_mode}
              onChange={(e) => setPayload((prev) => ({ ...prev, transport_mode: e.target.value }))}
            >
              <option value="voiture ANESP">{t('Véhicule ANESP', 'سيارة الوكالة', language)}</option>
              <option value="avion">{t('Avion', 'طائرة', language)}</option>
              <option value="mixte">{t('Mixte', 'مختلط', language)}</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">{t('Date de départ', 'تاريخ المغادرة', language)}</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.start_date}
              onChange={(e) => setPayload((prev) => ({ ...prev, start_date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">{t('Date de retour', 'تاريخ العودة', language)}</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.end_date}
              onChange={(e) => setPayload((prev) => ({ ...prev, end_date: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">{t('Objectif détaillé', 'الهدف التفصيلي', language)}</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              rows={3}
              value={payload.objective}
              onChange={(e) => setPayload((prev) => ({ ...prev, objective: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t('Destinations', 'الوجهات', language)}</h2>
          <button type="button" onClick={addDestination} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white">
            {t('Ajouter', 'إضافة', language)}
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {payload.destinations.map((destination, index) => (
            <div key={index} className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm text-slate-600">{t('Ville', 'المدينة', language)}</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={destination.city}
                  onChange={(e) => updateDestination(index, 'city', e.target.value)}
                  required
                >
                  <option value="">{t('Sélectionner une ville', 'اختر مدينة', language)}</option>
                  {cities.map((city, idx) => (
                    <option key={`${city.name}-${city.region}-${idx}`} value={city.name}>
                      {language === 'ar' ? city.nameAr : city.name} {city.region !== 'Nouakchott' ? `(${city.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600">{t('Distance (km)', 'المسافة (كم)', language)}</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 bg-slate-50"
                  value={destination.distance_km}
                  onChange={(e) => updateDestination(index, 'distance_km', e.target.value)}
                  min="0"
                  required
                  readOnly
                  title={t('Distance calculée automatiquement depuis Nouakchott', 'المسافة محسوبة تلقائياً من نواكشوط', language)}
                />
              </div>
              {payload.destinations.length > 1 && (
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeDestination(index)}
                    className="text-xs text-red-500"
                  >
                    {t('Retirer', 'حذف', language)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t('Participants', 'المشاركون', language)}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={addInternalParticipant} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
              {t('Ajouter un interne', 'إضافة موظف داخلي', language)}
            </button>
            <button type="button" onClick={addExternalParticipant} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {t('Ajouter un externe', 'إضافة ضيف خارجي', language)}
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {payload.participants.map((participant, index) => (
            <div key={index} className="rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {participant.participant_type === 'internal'
                    ? t('Agent interne', 'موظف داخلي', language)
                    : t('Invité externe', 'ضيف خارجي', language)}
                </span>
                <button type="button" onClick={() => removeParticipant(index)} className="text-xs text-red-500">
                  {t('Retirer', 'حذف', language)}
                </button>
              </div>
              {participant.participant_type === 'internal' ? (
                <select
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
                  value={participant.user_id || ''}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setPayload((prev) => {
                      const participants = [...prev.participants];
                      participants[index] = { ...participants[index], user_id: value };
                      return { ...prev, participants };
                    });
                  }}
                  required
                >
                  <option value="">{t('Choisir un agent', 'اختر موظفاً', language)}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id} disabled={employee.status !== 'available'}>
                      {employee.first_name} {employee.last_name} — {employee.grade || '-'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <input
                    placeholder={t('Prénom', 'الاسم الأول', language)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.first_name || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], first_name: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                    required
                  />
                  <input
                    placeholder={t('Nom', 'اللقب', language)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.last_name || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], last_name: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                    required
                  />
                  <input
                    placeholder="NNI"
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.nni || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], nni: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                  />
                  <input
                    placeholder={t('Profession', 'المهنة', language)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.profession || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], profession: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                  />
                  <input
                    placeholder={t('Ministère', 'الوزارة', language)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.ministry || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], ministry: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                  />
                  <input
                    placeholder={t('Grade', 'الرتبة', language)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                    value={participant.grade || ''}
                    onChange={(e) =>
                      setPayload((prev) => {
                        const participants = [...prev.participants];
                        participants[index] = { ...participants[index], grade: e.target.value };
                        return { ...prev, participants };
                      })
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">{t('Pièces justificatives', 'المستندات الداعمة', language)}</h2>
        <input
          type="file"
          multiple
          className="mt-3"
          onChange={(event) => setAttachments(Array.from(event.target.files || []))}
        />
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">{t('Synthèse automatique', 'ملخص تلقائي', language)}</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">{t('Distance totale', 'المسافة الإجمالية', language)}</dt>
            <dd className="text-lg font-semibold text-slate-800">{totalDistance.toFixed(2)} km</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{t('Durée (jours)', 'المدة (أيام)', language)}</dt>
            <dd className="text-lg font-semibold text-slate-800">{durationDays}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{t('Carburant estimé (auto)', 'الوقود المقدر (تلقائي)', language)}</dt>
            <dd className="text-lg font-semibold text-slate-800">{fuelEstimate} L</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{t('Indemnités estimées', 'التعويضات المقدرة', language)}</dt>
            <dd className="text-lg font-semibold text-slate-800">{perDiemEstimate} MRU</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">{t('Frais et carburant', 'النفقات والوقود', language)}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">
              {t('Carburant (L) - Moyens Généraux', 'الوقود (لتر) - الوسائل العامة', language)}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.fuel_amount || 0}
              onChange={(e) => setPayload((prev) => ({ ...prev, fuel_amount: Number(e.target.value) || 0 }))}
              disabled={user?.role !== 'moyens_generaux' && user?.role !== 'super_admin'}
              title={user?.role !== 'moyens_generaux' && user?.role !== 'super_admin' 
                ? t('Réservé aux Moyens Généraux', 'مخصص للوسائل العامة', language)
                : ''}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('Estimation automatique:', 'التقدير التلقائي:', language)} {fuelEstimate} L
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-600">
              {t('Frais de mission (MRU) - Initiateur/DAF', 'نفقات المهمة (أوقية) - المبتدئ/المدير المالي', language)}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={payload.mission_fees || 0}
              onChange={(e) => setPayload((prev) => ({ ...prev, mission_fees: Number(e.target.value) || 0 }))}
              disabled={user?.role !== 'ingenieur' && user?.role !== 'daf' && user?.role !== 'super_admin'}
              title={user?.role !== 'ingenieur' && user?.role !== 'daf' && user?.role !== 'super_admin'
                ? t('Réservé à l\'initiateur ou au DAF', 'مخصص للمبتدئ أو المدير المالي', language)
                : ''}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('Indemnités estimées:', 'التعويضات المقدرة:', language)} {perDiemEstimate} MRU
            </p>
          </div>
        </div>
      </section>

      <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-white" disabled={submitting}>
        {submitting ? t('Création…', 'جاري الإنشاء…', language) : t('Soumettre pour validation', 'إرسال للموافقة', language)}
      </button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </form>
  );
}
