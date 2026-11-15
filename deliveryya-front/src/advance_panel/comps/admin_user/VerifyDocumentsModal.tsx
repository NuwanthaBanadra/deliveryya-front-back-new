import React, { useEffect, useState } from 'react';
import { XMarkIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';
import Select from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import { hasAccess } from '../../../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../../../util/FrontendAccess';
import { swalAlert } from '../../../util/SwalUtil';
import VerificationDocumentPreview from './VerificationDocumentPreview';

const customSelectFieldStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '2.4rem',
    padding: '0.1rem',
    borderWidth: '2px',
    borderColor: state.isFocused ? '#F59B0F' : '#E5E7EB',
    borderRadius: '0.75rem',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(245, 155, 15, 0.15)' : 'none',
    '&:hover': {
      borderColor: '#FCD34D',
    },
    transition: 'all 0.2s',
    backgroundColor: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#F59B0F' : state.isFocused ? '#FEF3C7' : 'white',
    color: state.isSelected ? 'white' : '#1F2937',
    cursor: 'pointer',
  }),
  placeholder: (base: any) => ({ ...base, color: '#9CA3AF' }),
  valueContainer: (base: any) => ({
    ...base,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(245, 155, 15, 0.2)',
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

type VerificationEntry = {
  id: number;
  url: string;
  desc: string;
  userId: number;
  verificationStatusId: number;
  docType: number;
};

type DocumentType = {
  id: number;
  name: string;
};

type VerificationStatus = {
  id: number;
  name: string;
};

type UploadFormState = {
  selectedDocType: number | null;
  description: string;
  selectedFile: File | null;
  preview: string;
};

interface VerifyDocumentsModalProps {
  isOpen: boolean;
  userId: string | number | null;
  userLabel?: string;
  onClose: () => void;
}

export function VerifyDocumentsModal({ isOpen, userId, userLabel, onClose }: VerifyDocumentsModalProps) {
  const resolvedUserId = Number(userId ?? localStorage.getItem('userId') ?? 0);
  const ownerLabel = userLabel?.trim() || (resolvedUserId ? `User #${resolvedUserId}` : 'selected user');

  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [verificationStatuses, setVerificationStatuses] = useState<VerificationStatus[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, number>>({});
  const [uploading, setUploading] = useState(false);
  const canDeleteVerificationData = hasAccess(FRONTEND_ACCESS_IDS.VERIFICATION_DATA_DELETE);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [updatingStatusEntryId, setUpdatingStatusEntryId] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    selectedDocType: null,
    description: '',
    selectedFile: null,
    preview: '',
  });

  useEffect(() => {
    if (!isOpen || resolvedUserId <= 0) {
      return;
    }

    void fetchDocumentTypes();
    void fetchVerificationStatuses();
    void fetchVerificationData();
  }, [isOpen, resolvedUserId]);

  useEffect(() => {
    if (!isOpen && uploadForm.preview) {
      URL.revokeObjectURL(uploadForm.preview);
    }
  }, [isOpen, uploadForm.preview]);

  const fetchDocumentTypes = async () => {
    try {
      setLoadingTypes(true);
      const res = await axiosInstance.get('/users/get-doc-types');
      const types = Array.isArray(res.data?.object) ? res.data.object : [];
      setDocumentTypes(types);
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to fetch document types', 'error');
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchVerificationStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const res = await axiosInstance.get('/users/get-verification-statuses');
      const statuses = Array.isArray(res.data?.object) ? res.data.object : [];
      setVerificationStatuses(statuses);
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to fetch verification statuses', 'error');
    } finally {
      setLoadingStatuses(false);
    }
  };

  const fetchVerificationData = async () => {
    try {
      const res = await axiosInstance.get(`/users/get-verification-data?userId=${resolvedUserId}`);
      const data = Array.isArray(res.data?.object) ? res.data.object : [];
      const mappedEntries = data.map((item: any) => ({
        id: item.id,
        url: item.url,
        desc: item.desc,
        userId: item.userId ?? resolvedUserId,
        verificationStatusId: item.verificationStatusId,
        docType: item.docType,
      }));

      setEntries(mappedEntries);
      setStatusDrafts(
        mappedEntries.reduce((acc: Record<number, number>, entry: VerificationEntry) => {
          acc[entry.id] = entry.verificationStatusId;
          return acc;
        }, {})
      );
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to fetch verification data', 'error');
    }
  };

  const handleFileSelection = (file: File | null) => {
    if (!file) return;

    setUploadForm((prev) => ({ ...prev, selectedFile: file }));

    const objUrl = URL.createObjectURL(file);
    setUploadForm((prev) => ({ ...prev, preview: objUrl }));
  };

  const handleUpload = async () => {
    const { selectedDocType, description, selectedFile } = uploadForm;

    if (!selectedFile) return swalAlert('Error', 'Please select a file', 'error');
    if (!selectedDocType) return swalAlert('Error', 'Please select a document type', 'error');
    if (!description.trim()) return swalAlert('Error', 'Please enter a description', 'error');

    setUploading(true);
    try {
      const duplicates = entries.filter((entry) => entry.docType === selectedDocType);
      if (duplicates.length) {
        if (!canDeleteVerificationData) {
          swalAlert('Unauthorized', 'You do not have permission to replace existing verification documents.', 'warning');
          return;
        }

        for (const duplicate of duplicates) {
          try {
            await axiosInstance.delete(`/users/delete-verification-data?verificationDataId=${duplicate.id}`);
          } catch (delErr: any) {
            console.error('Failed to delete existing verification data', delErr);
          }
        }
      }

      const form = new FormData();
      form.append('files', selectedFile);

      const uploadRes = await axiosInstance.post('/storage/upload?path=verification', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedPaths: string[] = Array.isArray(uploadRes.data?.object) ? uploadRes.data.object : [];
      if (!uploadedPaths.length) throw new Error('No upload path returned');

      await axiosInstance.post('/users/set-user-documents', {
        url: uploadedPaths[0],
        desc: description,
        userId: resolvedUserId,
        verificationStatusId: 4,
        docType: selectedDocType,
      });

      swalAlert('Success', 'Document uploaded successfully', 'success');

      if (uploadForm.preview) {
        URL.revokeObjectURL(uploadForm.preview);
      }

      setUploadForm({
        selectedDocType: null,
        description: '',
        selectedFile: null,
        preview: '',
      });

      void fetchVerificationData();
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (uploadForm.preview) {
      URL.revokeObjectURL(uploadForm.preview);
    }

    setUploadForm({
      selectedDocType: null,
      description: '',
      selectedFile: null,
      preview: '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteVerificationData) return;

    if (!confirm('Delete this document?')) return;

    try {
      await axiosInstance.delete(`/users/delete-verification-data?verificationDataId=${id}`);
      swalAlert('Success', 'Deleted', 'success');
      void fetchVerificationData();
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Delete failed', 'error');
    }
  };

  const handleVerificationStatusUpdate = async (verificationDataId: number, verificationStatusId: number) => {
    try {
      setUpdatingStatusEntryId(verificationDataId);
      await axiosInstance.post('/users/update-verification-status', {
        verificationDataId,
        verificationStatusId,
        userId: resolvedUserId,
      });

      swalAlert('Success', 'Verification status updated successfully', 'success');
      setEntries((prev) => prev.map((entry) => (entry.id === verificationDataId ? { ...entry, verificationStatusId } : entry)));
    } catch (err: any) {
      console.error(err);
      swalAlert('Error', err?.response?.data?.desc || 'Failed to update verification status', 'error');
    } finally {
      setUpdatingStatusEntryId(null);
    }
  };

  const getStatusClasses = (statusId: number) => {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 2:
        return 'bg-green-100 text-green-800 border border-green-200';
      case 3:
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusIcon = (statusId: number) => {
    const statusName = renderStatus(statusId).toLowerCase();

    if (statusName.includes('approve') || statusName.includes('verified') || statusName.includes('active')) {
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (statusName.includes('reject') || statusName.includes('decline') || statusName.includes('blocked')) {
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-4.707a1 1 0 001.414 0L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 000 1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zm-9 4a1 1 0 102 0 1 1 0 00-2 0zm1-9a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const renderStatus = (statusId: number) => {
    const found = verificationStatuses.find((status) => status.id === statusId);
    return found ? found.name : 'Unknown';
  };

  const closeModal = () => {
    if (uploadForm.preview) {
      URL.revokeObjectURL(uploadForm.preview);
    }
    onClose();
  };

  if (!isOpen || resolvedUserId <= 0) return null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-linear-to-r from-[#F59B0F] via-[#D17F0A] to-[#9A5F11] px-6 py-5 text-white">
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close verification documents modal"
            title="Close"
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <DocumentCheckIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black">Verification Documents</h2>
              <p className="mt-1 truncate text-sm font-semibold text-orange-100">{ownerLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide bg-gray-50 p-4 space-y-5">
          <div>
            {/* <p className="mb-5 text-sm text-gray-600">
              Upload and manage verification documents for this user. Select a document type, add a description, choose a file, and upload.
            </p> */}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Upload New Document</h3>

              {loadingTypes ? (
                <div className="text-center text-gray-500">Loading document types...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
                    <Select
                      options={documentTypes.map((type) => ({ value: type.id, label: type.name }))}
                      value={documentTypes.find((type) => type.id === uploadForm.selectedDocType)
                        ? {
                            value: uploadForm.selectedDocType,
                            label: documentTypes.find((type) => type.id === uploadForm.selectedDocType)?.name,
                          }
                        : null}
                      onChange={(option: any) =>
                        setUploadForm((prev) => ({ ...prev, selectedDocType: option ? Number(option.value) : null }))
                      }
                      isDisabled={uploading}
                      placeholder="Select a document type"
                      classNamePrefix="react-select"
                      styles={customSelectFieldStyles}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <input
                      type="text"
                      value={uploadForm.description}
                      onChange={(event) => setUploadForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="e.g., NIC Front, Passport Photo Page"
                      maxLength={45}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{uploadForm.description.length}/45 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                        uploadForm.preview ? 'bg-orange-50 border-orange-200' : 'hover:border-[#F59B0F] hover:bg-orange-50 border-gray-300'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                        disabled={uploading}
                        className="hidden"
                        id="verification-file-input"
                      />
                      <label htmlFor="verification-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                        <div className={`p-3 rounded-full ${uploadForm.selectedFile ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {uploadForm.selectedFile ? (
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-[#F59B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 004-4V8a4 4 0 00-4-4h-3" />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">
                          {uploadForm.selectedFile ? 'File selected' : 'Click to choose file'}
                        </div>
                        <div className="text-xs text-gray-500">Supported: Images (JPG, PNG, etc.) and PDFs</div>
                      </label>

                      {uploadForm.preview && (
                        <div className="mt-5 rounded-2xl border border-orange-200 bg-white/90 p-4 md:p-5 text-left shadow-sm">
                          <div className="flex items-center gap-4 md:gap-5">
                            <label
                              htmlFor="verification-file-input"
                              className="relative h-32 w-32 md:h-40 md:w-40 shrink-0 rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-100 cursor-pointer group"
                              title="Click preview to change file"
                            >
                              {uploadForm.selectedFile?.type.startsWith('image/') ? (
                                <img src={uploadForm.preview} alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                                <span className="text-white text-xs font-semibold px-2 py-1 rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Change image
                                </span>
                              </div>
                            </label>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">File selected</p>
                              <p className="text-sm font-semibold text-gray-900 truncate" title={uploadForm.selectedFile?.name || ''}>
                                {uploadForm.selectedFile?.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(uploadForm.selectedFile?.type || 'Unknown type')} • {uploadForm.selectedFile ? `${(uploadForm.selectedFile.size / 1024 / 1024).toFixed(2)} MB` : '0.00 MB'}
                              </p>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <button
                                        disabled={uploading || !uploadForm.selectedDocType || !uploadForm.description}
                                        onClick={handleUpload}
                                        className="sm:min-w-32 px-5 py-2 bg-[#F59B0F] text-white rounded-lg hover:bg-[#D17F0A] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                        >
                                        {uploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                        <button
                                        disabled={uploading}
                                        onClick={handleCancelPreview}
                                        className="sm:min-w-32 px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                        Cancel
                                        </button>
                                </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>

            {entries.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {entries.map((entry) => (
                  <div key={entry.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="relative group aspect-square overflow-hidden bg-gray-100">
                      <VerificationDocumentPreview url={entry.url} title={entry.desc || 'Verification document'} />
                    </div>

                    <div className="p-4">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-900">{entry.desc}</p>
                        <p className="text-xs text-gray-500">Type: {documentTypes.find((type) => type.id === entry.docType)?.name || 'Unknown'}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusClasses(entry.verificationStatusId)}`}>
                            {getStatusIcon(entry.verificationStatusId)}
                            {renderStatus(entry.verificationStatusId)}
                          </span>

                          {canDeleteVerificationData && (
                            <button
                              onClick={() => handleDelete(entry.id)}
                              title="Delete document"
                              aria-label="Delete document"
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-1.327L4.772 5.79m14.456 0A48.108 48.108 0 0015.75 5.5m3.478.29V4.875c0-1.18-.91-2.157-2.088-2.192a51.964 51.964 0 00-3.32 0c-1.178.035-2.088 1.011-2.088 2.192v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Change verification status</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                              <Select
                                options={verificationStatuses.map((status) => ({ value: status.id, label: status.name }))}
                                value={verificationStatuses.find((status) => status.id === (statusDrafts[entry.id] ?? entry.verificationStatusId))
                                  ? {
                                      value: statusDrafts[entry.id] ?? entry.verificationStatusId,
                                      label:
                                        verificationStatuses.find((status) => status.id === (statusDrafts[entry.id] ?? entry.verificationStatusId))?.name || 'Unknown',
                                    }
                                  : null}
                                onChange={(option: any) => {
                                  setStatusDrafts((prev) => ({
                                    ...prev,
                                    [entry.id]: option?.value ? Number(option.value) : entry.verificationStatusId,
                                  }));
                                }}
                                isDisabled={loadingStatuses || verificationStatuses.length === 0 || updatingStatusEntryId === entry.id}
                                placeholder={loadingStatuses ? 'Loading statuses...' : 'Select status'}
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                styles={customSelectFieldStyles}
                              />
                            </div>

                            <button
                              onClick={() => {
                                const nextStatusId = statusDrafts[entry.id] ?? entry.verificationStatusId;
                                void handleVerificationStatusUpdate(entry.id, nextStatusId);
                              }}
                              disabled={
                                loadingStatuses ||
                                verificationStatuses.length === 0 ||
                                updatingStatusEntryId === entry.id ||
                                (statusDrafts[entry.id] ?? entry.verificationStatusId) === entry.verificationStatusId
                              }
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              {updatingStatusEntryId === entry.id ? 'Updating...' : 'Update'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
