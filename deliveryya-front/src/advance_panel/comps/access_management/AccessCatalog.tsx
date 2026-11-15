import React, { useEffect, useMemo, useState } from 'react';
import Select, { type SingleValue } from 'react-select';
import {
  ArrowPathIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  ServerStackIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { AccessRecord, ApiFeature, ApiRoute } from '../../../types/AccessModels';
import {
  fetchApiFeatures,
  fetchAccessLevels,
  fetchAccessTypes,
  getAllAccesses,
  getAllApis,
  linkAccessWithApi,
  setApiFeaturesForApi,
} from '../../../util/AccessApi';
import { swalAlert } from '../../../util/SwalUtil';
import CreateAccessModal from './modals/CreateAccessModal';
import SetAccessModal from './modals/SetAccessModal';
import {
  allAccessLevelOption,
  allAccessTypeOption,
  getAccessSelectStyles,
  getPageSizeOption,
  toPageSizeOptions,
  type SelectOption,
} from './selectHelpers';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_SELECT_OPTIONS = toPageSizeOptions(PAGE_SIZE_OPTIONS);

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  totalCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
        Rows
        <div className="w-24">
          <Select<SelectOption<number>, false>
            value={getPageSizeOption(PAGE_SIZE_SELECT_OPTIONS, pageSize)}
            onChange={(option: SingleValue<SelectOption<number>>) => {
              if (option) onPageSizeChange(option.value);
            }}
            options={PAGE_SIZE_SELECT_OPTIONS}
            styles={getAccessSelectStyles<SelectOption<number>>()}
            isDisabled={isLoading}
            isSearchable={false}
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>
      </label>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || isLoading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-700">Page {Math.min(page, totalPages)} of {totalPages}</span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || isLoading}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

const FeaturePill: React.FC<{ feature: ApiFeature }> = ({ feature }) => (
  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-[#8A541D] ring-1 ring-amber-200">
    {feature.name}
  </span>
);

const MethodBadge: React.FC<{ method?: string }> = ({ method }) => {
  const value = method?.toUpperCase() || 'API';
  const colorClass = value === 'GET'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : value === 'POST'
      ? 'bg-blue-50 text-blue-700 ring-blue-200'
      : value === 'PUT' || value === 'PATCH'
        ? 'bg-purple-50 text-purple-700 ring-purple-200'
        : value === 'DELETE'
          ? 'bg-red-50 text-red-700 ring-red-200'
          : 'bg-gray-50 text-gray-700 ring-gray-200';

  return (
    <span className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${colorClass}`}>
      {value}
    </span>
  );
};

type FeatureModalMode = 'link' | 'update';

interface FeaturePickerModalProps {
  access: AccessRecord;
  api: ApiRoute;
  mode: FeatureModalMode;
  initialSelectedFeatureIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const FeaturePickerModal: React.FC<FeaturePickerModalProps> = ({
  access,
  api,
  mode,
  initialSelectedFeatureIds,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [features, setFeatures] = useState<ApiFeature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedFeatureIds(Array.from(new Set(initialSelectedFeatureIds)));

    const loadFeatures = async () => {
      try {
        setIsLoading(true);
        const loaded = await fetchApiFeatures(api.id);
        setFeatures(loaded.length > 0 ? loaded : api.apiFeatures);
      } catch (error) {
        console.error('Failed to fetch API features:', error);
        setFeatures(api.apiFeatures);
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeatures();
  }, [api, initialSelectedFeatureIds, isOpen]);

  if (!isOpen) return null;

  const toggleFeature = (featureId: number) => {
    setSelectedFeatureIds((prev) => (
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    ));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (mode === 'update' && selectedFeatureIds.length > 0) {
        await setApiFeaturesForApi({
          accessId: access.id,
          apiId: api.id,
          apiFeatureIds: selectedFeatureIds,
        });
      } else {
        await linkAccessWithApi({
          accessId: access.id,
          apiId: api.id,
          apiFeatureIds: selectedFeatureIds,
          grant: true,
        });
      }

      swalAlert('Success', mode === 'link' ? 'API linked with access.' : 'API features updated.', 'success');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save API feature mapping:', error);
      swalAlert('Save failed', 'Please check the selected API features and try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between rounded-t-2xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-6 py-4 text-white">
          <div>
            <h3 className="text-lg font-semibold">{mode === 'link' ? 'Link API Route' : 'Set API Features'}</h3>
            <p className="mt-1 text-sm text-white/90">{access.name} / {api.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/20">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={api.apiMethod?.name} />
              <span className="text-sm font-semibold text-gray-900">{api.name}</span>
            </div>
            {api.desc && <p className="mt-2 text-sm text-gray-600">{api.desc}</p>}
          </div>

          <div className="space-y-2">
            {isLoading && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[#AC6C2A]">
                Loading API features...
              </div>
            )}

            {!isLoading && features.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                This API does not have feature records yet. Saving will link the API route without feature restrictions.
              </div>
            )}

            {!isLoading && features.map((feature) => (
              <label
                key={feature.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-amber-300 hover:bg-amber-50"
              >
                <input
                  type="checkbox"
                  checked={selectedFeatureIds.includes(feature.id)}
                  onChange={() => toggleFeature(feature.id)}
                  className="mt-1 h-4 w-4 rounded text-[#F59B0F] focus:ring-[#F59B0F]"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{feature.name}</span>
                  {feature.desc && <span className="block text-xs text-gray-500">{feature.desc}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : mode === 'link' ? 'Link API' : 'Save Features'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AccessCatalog: React.FC = () => {
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<AccessRecord | null>(null);
  const [accessSearch, setAccessSearch] = useState('');
  const [debouncedAccessSearch, setDebouncedAccessSearch] = useState('');
  const [accessPage, setAccessPage] = useState(1);
  const [accessPageSize, setAccessPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [accessTotalCount, setAccessTotalCount] = useState(0);
  const [isLoadingAccesses, setIsLoadingAccesses] = useState(true);
  const [accessReloadKey, setAccessReloadKey] = useState(0);
  const [accessTypeOptions, setAccessTypeOptions] = useState<SelectOption<number>[]>([allAccessTypeOption]);
  const [selectedAccessType, setSelectedAccessType] = useState<SelectOption<number>>(allAccessTypeOption);
  const [accessLevelOptions, setAccessLevelOptions] = useState<SelectOption<number>[]>([allAccessLevelOption]);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<SelectOption<number>>(allAccessLevelOption);

  const [linkedApis, setLinkedApis] = useState<ApiRoute[]>([]);
  const [linkedPage, setLinkedPage] = useState(1);
  const [linkedPageSize, setLinkedPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [linkedTotalCount, setLinkedTotalCount] = useState(0);
  const [isLoadingLinkedApis, setIsLoadingLinkedApis] = useState(false);
  const [apiReloadKey, setApiReloadKey] = useState(0);

  const [allApis, setAllApis] = useState<ApiRoute[]>([]);
  const [apiSearch, setApiSearch] = useState('');
  const [debouncedApiSearch, setDebouncedApiSearch] = useState('');
  const [apiPage, setApiPage] = useState(1);
  const [apiPageSize, setApiPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [apiTotalCount, setApiTotalCount] = useState(0);
  const [isLoadingApis, setIsLoadingApis] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<AccessRecord | null>(null);
  const [featureModal, setFeatureModal] = useState<{
    mode: FeatureModalMode;
    api: ApiRoute;
    selectedFeatureIds: number[];
  } | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedAccessSearch(accessSearch.trim());
      setAccessPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [accessSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedApiSearch(apiSearch.trim());
      setApiPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [apiSearch]);

  useEffect(() => {
    const loadAccessFilterOptions = async () => {
      try {
        const [loadedTypes, loadedLevels] = await Promise.all([
          fetchAccessTypes(),
          fetchAccessLevels(),
        ]);
        setAccessTypeOptions([
          allAccessTypeOption,
          ...loadedTypes
            .map((type) => ({
              value: Number(type.id),
              label: type.name,
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0),
        ]);
        setAccessLevelOptions([
          allAccessLevelOption,
          ...loadedLevels
            .map((level) => ({
              value: Number(level.id),
              label: level.name,
            }))
            .filter((option) => Number.isFinite(option.value) && option.value > 0),
        ]);
      } catch (error) {
        console.error('Failed to load access filter options:', error);
        setAccessTypeOptions([allAccessTypeOption]);
        setAccessLevelOptions([allAccessLevelOption]);
      }
    };

    void loadAccessFilterOptions();
  }, []);

  useEffect(() => {
    const loadAccesses = async () => {
      try {
        setIsLoadingAccesses(true);
        const result = await getAllAccesses({
          pageNumber: accessPage - 1,
          countPerPage: accessPageSize,
          includeLinkedApis: true,
          includeGrantMeta: true,
          accessTypeId: selectedAccessType.value > 0 ? selectedAccessType.value : null,
          accessLevelId: selectedAccessLevel.value > 0 ? selectedAccessLevel.value : null,
          search: debouncedAccessSearch || null,
        });

        setAccesses(result.items);
        setAccessTotalCount(result.totalCount);
        setSelectedAccess((prev) => {
          const refreshed = prev ? result.items.find((item) => item.id === prev.id) : null;
          if (refreshed) return refreshed;
          return result.items[0] ?? null;
        });
      } catch (error) {
        console.error('Failed to fetch accesses:', error);
        setAccesses([]);
        setAccessTotalCount(0);
      } finally {
        setIsLoadingAccesses(false);
      }
    };

    void loadAccesses();
  }, [accessPage, accessPageSize, accessReloadKey, debouncedAccessSearch, selectedAccessLevel, selectedAccessType]);

  useEffect(() => {
    if (!selectedAccess) {
      setLinkedApis([]);
      setLinkedTotalCount(0);
      return;
    }

    const loadLinkedApis = async () => {
      try {
        setIsLoadingLinkedApis(true);
        const result = await getAllApis({
          pageNumber: linkedPage - 1,
          countPerPage: linkedPageSize,
          accessId: selectedAccess.id,
          search: null,
        });
        setLinkedApis(result.items);
        setLinkedTotalCount(result.totalCount);
      } catch (error) {
        console.error('Failed to fetch linked APIs:', error);
        setLinkedApis([]);
        setLinkedTotalCount(0);
      } finally {
        setIsLoadingLinkedApis(false);
      }
    };

    void loadLinkedApis();
  }, [apiReloadKey, linkedPage, linkedPageSize, selectedAccess]);

  useEffect(() => {
    if (!selectedAccess) {
      setAllApis([]);
      setApiTotalCount(0);
      return;
    }

    const loadApis = async () => {
      try {
        setIsLoadingApis(true);
        const result = await getAllApis({
          pageNumber: apiPage - 1,
          countPerPage: apiPageSize,
          accessId: null,
          search: debouncedApiSearch || null,
        });
        setAllApis(result.items);
        setApiTotalCount(result.totalCount);
      } catch (error) {
        console.error('Failed to fetch APIs:', error);
        setAllApis([]);
        setApiTotalCount(0);
      } finally {
        setIsLoadingApis(false);
      }
    };

    void loadApis();
  }, [apiPage, apiPageSize, debouncedApiSearch, selectedAccess]);

  useEffect(() => {
    setLinkedPage(1);
    setApiPage(1);
  }, [selectedAccess?.id]);

  const linkedFeatureIdsByApiId = useMemo(() => {
    const map = new Map<number, number[]>();
    linkedApis.forEach((api) => {
      map.set(api.id, api.apiFeatures.map((feature) => feature.id));
    });
    return map;
  }, [linkedApis]);

  const refreshAccessesAndApis = () => {
    setAccessReloadKey((prev) => prev + 1);
    setApiReloadKey((prev) => prev + 1);
  };

  const handleUnlinkApi = async (api: ApiRoute) => {
    if (!selectedAccess) return;

    try {
      await linkAccessWithApi({
        accessId: selectedAccess.id,
        apiId: api.id,
        grant: false,
      });
      swalAlert('Success', 'API route unlinked from access.', 'success');
      refreshAccessesAndApis();
    } catch (error) {
      console.error('Failed to unlink API:', error);
      swalAlert('Unlink failed', 'Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-[#AC6C2A] ring-1 ring-amber-200">
              <ServerStackIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Accesses and API Routes</h2>
              <p className="text-sm text-gray-500">Create access records, link APIs, and set feature-level grants.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md"
          >
            <PlusIcon className="h-4 w-4" />
            Create Access
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(190px,240px)_minmax(190px,240px)] xl:max-w-5xl">
              <input
                type="text"
                value={accessSearch}
                onChange={(event) => setAccessSearch(event.target.value)}
                placeholder="Search accesses by name or description..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
              />
              <Select<SelectOption<number>, false>
                value={selectedAccessType}
                onChange={(option: SingleValue<SelectOption<number>>) => {
                  setSelectedAccessType(option ?? allAccessTypeOption);
                  setAccessPage(1);
                }}
                options={accessTypeOptions}
                styles={getAccessSelectStyles<SelectOption<number>>()}
                placeholder="Filter by access type"
                isClearable={false}
                className="react-select-container"
                classNamePrefix="react-select"
              />
              <Select<SelectOption<number>, false>
                value={selectedAccessLevel}
                onChange={(option: SingleValue<SelectOption<number>>) => {
                  setSelectedAccessLevel(option ?? allAccessLevelOption);
                  setAccessPage(1);
                }}
                options={accessLevelOptions}
                styles={getAccessSelectStyles<SelectOption<number>>()}
                placeholder="Filter by access level"
                isClearable={false}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            <PaginationControls
              page={accessPage}
              pageSize={accessPageSize}
              totalCount={accessTotalCount}
              isLoading={isLoadingAccesses}
              onPageChange={setAccessPage}
              onPageSizeChange={(nextPageSize) => {
                setAccessPageSize(nextPageSize);
                setAccessPage(1);
              }}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Access</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Level</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">APIs</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoadingAccesses && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-sm text-[#AC6C2A]">Loading accesses...</td>
                  </tr>
                )}

                {!isLoadingAccesses && accesses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-sm text-gray-500">No accesses found.</td>
                  </tr>
                )}

                {!isLoadingAccesses && accesses.map((access) => {
                  const isSelected = selectedAccess?.id === access.id;

                  return (
                    <tr key={access.id} className={isSelected ? 'bg-amber-50/60' : 'hover:bg-gray-50'}>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedAccess(access)}
                          className="text-left"
                        >
                          <span className="block text-sm font-semibold text-gray-900">{access.name}</span>
                          <span className="block max-w-xl text-xs text-gray-500">{access.desc || 'No description'}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{access.accessType?.name ?? '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{access.accessLevel?.name ?? '-'}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {access.apis.length}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAccess(access)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-[#AC6C2A] hover:bg-amber-50"
                          >
                            <LinkIcon className="h-4 w-4" />
                            APIs
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAccess(access)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm text-gray-600">Showing {accesses.length} of {accessTotalCount} accesses</p>
        </div>
      </div>

      {selectedAccess && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-bold text-gray-900">{selectedAccess.name}</h3>
            <p className="text-sm text-gray-500">Manage API route links and feature assignments for this access.</p>
          </div>

          <div className="grid gap-6 px-6 py-5 xl:grid-cols-2">
            <section>
              <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Linked API Routes</h4>
                  <p className="text-sm text-gray-500">Routes currently protected by this access.</p>
                </div>
                <PaginationControls
                  page={linkedPage}
                  pageSize={linkedPageSize}
                  totalCount={linkedTotalCount}
                  isLoading={isLoadingLinkedApis}
                  onPageChange={setLinkedPage}
                  onPageSizeChange={(nextPageSize) => {
                    setLinkedPageSize(nextPageSize);
                    setLinkedPage(1);
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {isLoadingLinkedApis && (
                    <div className="px-4 py-5 text-sm text-[#AC6C2A]">Loading linked APIs...</div>
                  )}

                  {!isLoadingLinkedApis && linkedApis.length === 0 && (
                    <div className="px-4 py-5 text-sm text-gray-500">No APIs linked with this access yet.</div>
                  )}

                  {!isLoadingLinkedApis && linkedApis.map((api) => (
                    <div key={api.id} className="px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <MethodBadge method={api.apiMethod?.name} />
                            <span className="text-sm font-semibold text-gray-900">{api.name}</span>
                          </div>
                          {api.desc && <p className="mt-1 text-sm text-gray-500">{api.desc}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {api.apiFeatures.length > 0
                              ? api.apiFeatures.map((feature) => <FeaturePill key={feature.id} feature={feature} />)
                              : <span className="text-xs text-gray-400">No feature filters set</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFeatureModal({
                              mode: 'update',
                              api,
                              selectedFeatureIds: api.apiFeatures.map((feature) => feature.id),
                            })}
                            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-[#AC6C2A] hover:bg-amber-50"
                          >
                            Set Features
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUnlinkApi(api)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Unlink
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">All API Routes</h4>
                  <p className="text-sm text-gray-500">Find a route and attach it to the selected access.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setApiReloadKey((prev) => prev + 1)}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <input
                  type="text"
                  value={apiSearch}
                  onChange={(event) => setApiSearch(event.target.value)}
                  placeholder="Search API routes..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 2xl:max-w-xs"
                />
                <PaginationControls
                  page={apiPage}
                  pageSize={apiPageSize}
                  totalCount={apiTotalCount}
                  isLoading={isLoadingApis}
                  onPageChange={setApiPage}
                  onPageSizeChange={(nextPageSize) => {
                    setApiPageSize(nextPageSize);
                    setApiPage(1);
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {isLoadingApis && (
                    <div className="px-4 py-5 text-sm text-[#AC6C2A]">Loading APIs...</div>
                  )}

                  {!isLoadingApis && allApis.length === 0 && (
                    <div className="px-4 py-5 text-sm text-gray-500">No API routes found.</div>
                  )}

                  {!isLoadingApis && allApis.map((api) => {
                    const linkedFeatureIds = linkedFeatureIdsByApiId.get(api.id);
                    const isLinkedOnCurrentPage = linkedFeatureIds !== undefined;

                    return (
                      <div key={api.id} className="px-4 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <MethodBadge method={api.apiMethod?.name} />
                              <span className="text-sm font-semibold text-gray-900">{api.name}</span>
                            </div>
                            {api.desc && <p className="mt-1 text-sm text-gray-500">{api.desc}</p>}
                            <p className="mt-2 text-xs text-gray-400">{api.apiFeatures.length} available feature{api.apiFeatures.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFeatureModal({
                              mode: isLinkedOnCurrentPage ? 'update' : 'link',
                              api,
                              selectedFeatureIds: linkedFeatureIds ?? [],
                            })}
                            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <LinkIcon className="h-4 w-4" />
                            {isLinkedOnCurrentPage ? 'Update' : 'Link'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600">Showing {allApis.length} of {apiTotalCount} API routes</p>
            </section>
          </div>
        </div>
      )}

      <CreateAccessModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newId) => {
          setIsCreateOpen(false);
          refreshAccessesAndApis();
          if (newId > 0) {
            void getAllAccesses({
              pageNumber: 0,
              countPerPage: 1,
              accessId: newId,
              includeLinkedApis: true,
              includeGrantMeta: true,
              search: null,
            }).then((result) => {
              if (result.items[0]) setSelectedAccess(result.items[0]);
            });
          }
        }}
      />

      <SetAccessModal
        isOpen={editingAccess !== null}
        onClose={() => setEditingAccess(null)}
        accessId={editingAccess?.id ?? null}
        initial={editingAccess ? {
          name: editingAccess.name,
          desc: editingAccess.desc,
          accessLevelId: editingAccess.accessLevel?.id ?? 0,
          accessTypeId: editingAccess.accessType?.id ?? 0,
        } : null}
        onSaved={() => {
          setEditingAccess(null);
          refreshAccessesAndApis();
        }}
      />

      {selectedAccess && featureModal && (
        <FeaturePickerModal
          isOpen={featureModal !== null}
          access={selectedAccess}
          api={featureModal.api}
          mode={featureModal.mode}
          initialSelectedFeatureIds={featureModal.selectedFeatureIds}
          onClose={() => setFeatureModal(null)}
          onSaved={refreshAccessesAndApis}
        />
      )}
    </div>
  );
};

export default AccessCatalog;
