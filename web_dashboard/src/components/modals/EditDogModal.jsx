import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function EditDogModal({ dog, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    size: 'medium',
    color: '',
    breed: 'mixed',
    gender: 'unknown',
    estimatedAge: 'unknown',
    zone: '',
    healthStatus: {
      isHealthy: true,
      isInjured: false,
      isVaccinated: false,
      isSterilized: false,
      injuryDescription: '',
      notes: ''
    },
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dog && isOpen) {
      setFormData({
        name: dog.name || '',
        size: dog.size || 'medium',
        color: dog.color || '',
        breed: dog.breed || 'mixed',
        gender: dog.gender || 'unknown',
        estimatedAge: dog.estimatedAge || 'unknown',
        zone: dog.zone || '',
        healthStatus: {
          isHealthy: dog.healthStatus?.isHealthy ?? true,
          isInjured: dog.healthStatus?.isInjured ?? false,
          isVaccinated: dog.healthStatus?.isVaccinated ?? false,
          isSterilized: dog.healthStatus?.isSterilized ?? false,
          injuryDescription: dog.healthStatus?.injuryDescription || '',
          notes: dog.healthStatus?.notes || ''
        },
        notes: dog.notes || ''
      });
    }
  }, [dog, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(dog._id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving dog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHealthStatusChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      healthStatus: {
        ...prev.healthStatus,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                Edit Dog Details - {dog?.dogId || 'Unknown'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dog-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="dog-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label htmlFor="dog-zone" className="block text-sm font-medium text-gray-700 mb-1">
                    Zone *
                  </label>
                  <input
                    id="dog-zone"
                    type="text"
                    value={formData.zone}
                    onChange={(e) => handleChange('zone', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              {/* Physical Characteristics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="dog-size" className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <select
                    id="dog-size"
                    value={formData.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dog-gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="dog-gender"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dog-age" className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Age
                  </label>
                  <select
                    id="dog-age"
                    value={formData.estimatedAge}
                    onChange={(e) => handleChange('estimatedAge', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="puppy">Puppy</option>
                    <option value="young">Young</option>
                    <option value="adult">Adult</option>
                    <option value="senior">Senior</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dog-color" className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    id="dog-color"
                    type="text"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="e.g., brown, white"
                  />
                </div>

                <div>
                  <label htmlFor="dog-breed" className="block text-sm font-medium text-gray-700 mb-1">
                    Breed
                  </label>
                  <input
                    id="dog-breed"
                    type="text"
                    value={formData.breed}
                    onChange={(e) => handleChange('breed', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Health Status */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Health Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isVaccinated"
                      checked={formData.healthStatus.isVaccinated}
                      onChange={(e) => handleHealthStatusChange('isVaccinated', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isVaccinated" className="ml-2 text-sm text-gray-700">
                      Vaccinated
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isSterilized"
                      checked={formData.healthStatus.isSterilized}
                      onChange={(e) => handleHealthStatusChange('isSterilized', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isSterilized" className="ml-2 text-sm text-gray-700">
                      Sterilized
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isInjured"
                      checked={formData.healthStatus.isInjured}
                      onChange={(e) => handleHealthStatusChange('isInjured', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="isInjured" className="ml-2 text-sm text-gray-700">
                      Injured
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isHealthy"
                      checked={formData.healthStatus.isHealthy}
                      onChange={(e) => handleHealthStatusChange('isHealthy', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor="isHealthy" className="ml-2 text-sm text-gray-700">
                      Healthy
                    </label>
                  </div>
                </div>

                {formData.healthStatus.isInjured && (
                  <div className="mt-3">
                    <label htmlFor="injury-description" className="block text-sm font-medium text-gray-700 mb-1">
                      Injury Description
                    </label>
                    <textarea
                      id="injury-description"
                      value={formData.healthStatus.injuryDescription}
                      onChange={(e) => handleHealthStatusChange('injuryDescription', e.target.value)}
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Describe the injury..."
                    />
                  </div>
                )}

                <div className="mt-3">
                  <label htmlFor="health-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Health Notes
                  </label>
                  <textarea
                    id="health-notes"
                    value={formData.healthStatus.notes}
                    onChange={(e) => handleHealthStatusChange('notes', e.target.value)}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Any health-related notes..."
                  />
                </div>
              </div>

              {/* General Notes */}
              <div>
                <label htmlFor="general-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  General Notes
                </label>
                <textarea
                  id="general-notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Any additional information..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
