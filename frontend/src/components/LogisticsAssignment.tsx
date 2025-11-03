'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import logisticsService, { Driver, Vehicle } from '@/services/logisticsService';
import { LogisticsPayload } from '@/services/missionService';

interface LogisticsAssignmentProps {
  missionId: string;
  missionType: 'terrestre' | 'aerienne';
  onAssignmentComplete: () => void;
}

export default function LogisticsAssignment({ missionId, missionType, onAssignmentComplete }: LogisticsAssignmentProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [lodgingDetails, setLodgingDetails] = useState('');
  const [ticketsDetails, setTicketsDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [vehicleList, driverList] = await Promise.all([
          logisticsService.listVehicles(),
          logisticsService.listDrivers()
        ]);
        setVehicles(vehicleList || []);
        setDrivers(driverList || []);
      } catch (err) {
        console.error('Error loading logistics resources', err);
        setError('Erreur lors du chargement des ressources logistiques');
      }
    };

    loadResources();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: LogisticsPayload = {
        notes: notes || undefined,
        lodging_details: lodgingDetails || undefined,
        tickets_details: missionType === 'aerienne' ? ticketsDetails || undefined : undefined
      };

      if (missionType === 'terrestre') {
        if (!selectedVehicle || !selectedDriver) {
          setError('Véhicule et chauffeur requis pour une mission terrestre');
          setLoading(false);
          return;
        }
        payload.vehicle_id = selectedVehicle;
        payload.driver_id = selectedDriver;
        payload.fuel_amount = fuelAmount ? Number(fuelAmount) : undefined;
      }

      await logisticsService.assignLogistics(missionId, payload);
      toast.success('Affectation logistique enregistrée');
      onAssignmentComplete();
    } catch (err: any) {
      console.error('Error assigning logistics', err);
      const message = err?.response?.data?.message || err.message || "Erreur lors de l'attribution des moyens logistiques";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isTerrestrial = missionType === 'terrestre';
  const isAerial = missionType === 'aerienne';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Attribution des Moyens Logistiques</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isTerrestrial && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Véhicule ANESP *</label>
              <select
                value={selectedVehicle}
                onChange={(event) => setSelectedVehicle(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un véhicule</option>
                {vehicles
                  .filter((vehicle) => vehicle.status === 'available')
                  .map((vehicle) => (
                    <option key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.label} — {vehicle.registration}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chauffeur *</label>
              <select
                value={selectedDriver}
                onChange={(event) => setSelectedDriver(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un chauffeur</option>
                {drivers
                  .filter((driver) => driver.status === 'available')
                  .map((driver) => (
                    <option key={driver.id} value={String(driver.id)}>
                      {driver.first_name} {driver.last_name} — {driver.phone || 'N° indisponible'}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantité de carburant (en litres)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fuelAmount}
                onChange={(event) => setFuelAmount(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {isAerial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Détails des billets et justificatifs *</label>
            <textarea
              value={ticketsDetails}
              onChange={(event) => setTicketsDetails(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Compagnie, numéro de vol, montant, etc."
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hébergement</label>
          <textarea
            value={lodgingDetails}
            onChange={(event) => setLodgingDetails(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Hôtel, dates, coordonnées"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes complémentaires</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Commentaires ou instructions"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Attribution en cours..." : "Valider l'attribution"}
          </button>
        </div>
      </form>
    </div>
  );
}
