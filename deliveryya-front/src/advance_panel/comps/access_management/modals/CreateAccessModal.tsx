import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Select, { type SingleValue } from 'react-select';
import type { CreateAccessRequest } from '../../../../types/AccessModels';
import { createAccess, fetchAccessTypes, fetchAccessLevels, type AccessTypeOption, type AccessLevelOption } from '../../../../util/AccessApi';
import { swalAlert } from '../../../../util/SwalUtil';
import { getAccessSelectStyles, type SelectOption } from '../selectHelpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newId: number) => void;
}

const CreateAccessModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [accessLevelId, setAccessLevelId] = useState<number | null>(null);
  const [accessTypeId, setAccessTypeId] = useState<number | null>(null);
  const [accessTypes, setAccessTypes] = useState<AccessTypeOption[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevelOption[]>([]);
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
      const [types, levels] = await Promise.all([
        fetchAccessTypes(),
        fetchAccessLevels(),
      ]);
      setAccessTypes(types);
      setAccessLevels(levels);
      if (types.length > 0) setAccessTypeId(Number(types[0].id));
      if (levels.length > 0) setAccessLevelId(Number(levels[0].id));
    } catch (err) {
      console.error('Failed to load access types/levels:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const accessLevelOptions: SelectOption<number>[] = accessLevels
    .map((level) => ({ value: Number(level.id), label: level.name }))
    .filter((option) => Number.isFinite(option.value) && option.value > 0);

  const accessTypeOptions: SelectOption<number>[] = accessTypes
    .map((type) => ({ value: Number(type.id), label: type.name }))
    .filter((option) => Number.isFinite(option.value) && option.value > 0);

  const selectedAccessLevel = accessLevelOptions.find((option) => option.value === accessLevelId) ?? null;
  const selectedAccessType = accessTypeOptions.find((option) => option.value === accessTypeId) ?? null;

  const handleSave = async () => {
    if (!name.trim() || !desc.trim()) {
      swalAlert('Validation', 'Name and description are required', 'warning');
      return;
    }
    if (!accessLevelId || !accessTypeId) {
      swalAlert('Validation', 'Access Level and Type are required', 'warning');
      return;
    }

    const payload: CreateAccessRequest = {
      name: name.trim(),
      desc: desc.trim(),
      accessLevelId,
      accessTypeId,
    };

    try {
      setIsSaving(true);
      const res = await createAccess(payload);
      const newId = Number(res.object ?? 0);
      swalAlert('Success', 'Access created successfully', 'success');
      setName('');
      setDesc('');
      onCreated?.(newId);
      onClose();
    } catch (err) {
      console.error('Create access failed', err);
      swalAlert('Error', 'Failed to create access', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-600/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 flex items-center justify-between bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-t-2xl">
          <h3 className="text-lg font-semibold">Create Access</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full px-3 py-2 border rounded-lg" placeholder="e.g., View Reports" />

          <label className="block text-sm font-medium text-gray-700 mt-4">Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-2 w-full px-3 py-2 border rounded-lg" placeholder="What does this access allow?" rows={3} />

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-sm text-gray-700 font-medium">Access Level</label>
              <div className="mt-2">
                <Select<SelectOption<number>, false>
                  value={selectedAccessLevel}
                  onChange={(option: SingleValue<SelectOption<number>>) => setAccessLevelId(option?.value ?? null)}
                  options={accessLevelOptions}
                  styles={getAccessSelectStyles<SelectOption<number>>()}
                  isDisabled={isLoadingData}
                  placeholder="Select level..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium">Access Type</label>
              <div className="mt-2">
                <Select<SelectOption<number>, false>
                  value={selectedAccessType}
                  onChange={(option: SingleValue<SelectOption<number>>) => setAccessTypeId(option?.value ?? null)}
                  options={accessTypeOptions}
                  styles={getAccessSelectStyles<SelectOption<number>>()}
                  isDisabled={isLoadingData}
                  placeholder="Select type..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          </div>

          {isLoadingData && <p className="text-sm text-gray-500 mt-3">Loading access levels and types...</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={isSaving || isLoadingData} className="px-4 py-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white rounded-lg disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAccessModal;
