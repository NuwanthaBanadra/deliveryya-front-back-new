import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import AsyncSelect from 'react-select/async';
import type { SingleValue } from 'react-select';
import { setApiFeaturesForApi, getAllAccesses } from '../../../../util/AccessApi';
import { swalAlert } from '../../../../util/SwalUtil';
import { getAccessSelectStyles, type SelectOption } from '../selectHelpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SetApiFeaturesModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [selectedAccess, setSelectedAccess] = useState<SelectOption<number> | null>(null);
  const [apiId, setApiId] = useState<number | null>(null);
  const [apiFeatureIds, setApiFeatureIds] = useState<string>('');
  const [defaultAccessOptions, setDefaultAccessOptions] = useState<SelectOption<number>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const accessList = await loadAccessOptions('');
      setDefaultAccessOptions(accessList);
    } catch (err) {
      console.error('Failed to load accesses:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAccessOptions = async (inputValue: string): Promise<SelectOption<number>[]> => {
    try {
      const result = await getAllAccesses({
        pageNumber: 0,
        countPerPage: 20,
        includeLinkedApis: false,
        includeGrantMeta: false,
        search: inputValue.trim() || null,
      });

      return result.items.map((access) => ({
        value: access.id,
        label: access.name,
      }));
    } catch (error) {
      console.error('Failed to search accesses:', error);
      return [];
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedAccess || !apiId) {
      swalAlert('Validation', 'Access and API ID are required', 'warning');
      return;
    }

    const featureIds = apiFeatureIds
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (featureIds.length === 0) {
      swalAlert('Validation', 'Please enter at least one API Feature ID', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      await setApiFeaturesForApi({ accessId: selectedAccess.value, apiId, apiFeatureIds: featureIds });
      swalAlert('Success', 'API features set', 'success');
      setSelectedAccess(null);
      setApiId(null);
      setApiFeatureIds('');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to set api features', err);
      swalAlert('Error', 'Failed to set API features', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-600/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 flex items-center justify-between bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-t-2xl">
          <h3 className="text-lg font-semibold">Set API Features</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700">Select Access</label>
          <div className="mt-2">
            <AsyncSelect<SelectOption<number>, false>
              cacheOptions
              defaultOptions={defaultAccessOptions}
              loadOptions={loadAccessOptions}
              value={selectedAccess}
              onChange={(option: SingleValue<SelectOption<number>>) => setSelectedAccess(option)}
              styles={getAccessSelectStyles<SelectOption<number>>()}
              isDisabled={isLoadingData}
              isClearable
              placeholder="Search access..."
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
          {isLoadingData && <p className="text-xs text-gray-500 mt-1">Loading accesses...</p>}

          <label className="block text-sm font-medium text-gray-700 mt-4">API ID</label>
          <input 
            type="number" 
            value={apiId ?? ''} 
            onChange={(e) => setApiId(e.target.value ? Number(e.target.value) : null)} 
            className="mt-2 w-full px-3 py-2 border rounded-lg"
            placeholder="Enter API ID"
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">API Feature IDs (comma separated)</label>
          <input 
            value={apiFeatureIds} 
            onChange={(e) => setApiFeatureIds(e.target.value)} 
            className="mt-2 w-full px-3 py-2 border rounded-lg" 
            placeholder="e.g., 1, 2, 3"
          />

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={isSaving || isLoadingData} className="px-4 py-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-lg disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetApiFeaturesModal;
