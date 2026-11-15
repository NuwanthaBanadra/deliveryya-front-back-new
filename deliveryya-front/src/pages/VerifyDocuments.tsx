import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../util/AxiosUtil';
import Select from 'react-select';
import { hasAccess } from '../util/AccessController';
import { FRONTEND_ACCESS_IDS } from '../util/FrontendAccess';
import VerificationDocumentPreview from '../advance_panel/comps/admin_user/VerificationDocumentPreview';

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
import { swalAlert } from '../util/SwalUtil';

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

const canDeleteVerificationStatus = (statusName: string) => {
  const normalized = statusName.trim().toLowerCase();
  return normalized === 'new' || normalized === 'unverified';
};

function VerifyDocuments() {
  const [searchParams] = useSearchParams();
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

  // Get userId from query parameter first, then fall back to logged-in user from localStorage
  const userId = Number(searchParams.get('userId')) || Number(localStorage.getItem('userId') || 0);
  const userIdQuery = searchParams.get('userId');

  useEffect(() => {
    if (userId > 0) {
      fetchDocumentTypes();
      fetchVerificationStatuses();
      fetchVerificationData();
    }
  }, [userId]);

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
      // Use statuses exactly as returned by backend
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
      const res = await axiosInstance.get(`/users/get-verification-data?userId=${userId}`);
      const data = Array.isArray(res.data?.object) ? res.data.object : [];
      const mappedEntries = data.map((it: any) => ({
        id: it.id,
        url: it.url,
        desc: it.desc,
        userId: it.userId ?? userId,
        verificationStatusId: it.verificationStatusId,
        docType: it.docType,
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

    // preview
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
      // If there are existing documents with the same docType, delete them first
      const duplicates = entries.filter((e) => e.docType === selectedDocType);
      if (duplicates.length) {
        const undeletableDuplicates = duplicates.filter((entry) => !canDeleteVerificationStatus(renderStatus(entry.verificationStatusId)));

        if (!canDeleteVerificationData) {
          swalAlert('Unauthorized', 'You do not have permission to replace existing verification documents.', 'warning');
          return;
        }

        if (undeletableDuplicates.length > 0) {
          swalAlert(
            'Cannot Replace Document',
            'Only documents with status New or Unverified can be deleted.',
            'warning'
          );
          return;
        }

        for (const dup of duplicates) {
          try {
            await axiosInstance.delete(`/users/delete-verification-data?verificationDataId=${dup.id}`);
          } catch (delErr: any) {
            console.error('Failed to delete existing verification data', delErr);
          }
        }
      }

      const form = new FormData();
      form.append('files', selectedFile);

      const uploadRes = await axiosInstance.post(`/storage/upload?path=verification`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedPaths: string[] = Array.isArray(uploadRes.data?.object) ? uploadRes.data.object : [];
      if (!uploadedPaths.length) throw new Error('No upload path returned');

      // const url = resolveDocumentUrl(uploadedPaths[0]);

      await axiosInstance.post('/users/set-user-documents', {
        url: uploadedPaths[0],
        desc: description,
        userId,
        verificationStatusId: 4,
        docType: selectedDocType,
      });

      swalAlert('Success', 'Document uploaded successfully', 'success');

      // cleanup and reset form
      if (uploadForm.preview) {
        URL.revokeObjectURL(uploadForm.preview);
      }
      setUploadForm({
        selectedDocType: null,
        description: '',
        selectedFile: null,
        preview: '',
      });
      fetchVerificationData();
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

    const entry = entries.find((item) => item.id === id);
    if (!entry) return;

    if (!canDeleteVerificationStatus(renderStatus(entry.verificationStatusId))) {
      swalAlert('Warning', 'Only documents with status New or Unverified can be deleted.', 'warning');
      return;
    }

    if (!confirm('Delete this document?')) return;
    try {
      await axiosInstance.delete(`/users/delete-verification-data?verificationDataId=${id}`);
      swalAlert('Success', 'Deleted', 'success');
      fetchVerificationData();
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
        userId,
      });

      swalAlert('Success', 'Verification status updated successfully', 'success');
      setEntries((prev) => prev.map((entry) => (
        entry.id === verificationDataId
          ? { ...entry, verificationStatusId }
          : entry
      )));
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
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (statusName.includes('reject') || statusName.includes('decline') || statusName.includes('blocked')) {
      return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-4.707a1 1 0 001.414 0L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 000 1.414z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10A8 8 0 11.001 9.999 8 8 0 0118 10zm-9 4a1 1 0 102 0 1 1 0 00-2 0zm1-9a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  const renderStatus = (statusId: number) => {
    const found = verificationStatuses.find((s) => s.id === statusId);
    return found ? found.name : 'Unknown';
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Verification Documents</h2>

      <p className="mb-6 text-sm text-gray-600">Upload and manage your verification documents. Select a document type, add a description, choose a file, and upload.</p>

      {/* Upload Form Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-pink-100 mb-8">
        <h3 className="text-lg font-semibold mb-4">Upload New Document</h3>

        {loadingTypes ? (
          <div className="text-center text-gray-500">Loading document types...</div>
        ) : (
          <div className="space-y-4">
            {/* Document Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
              <Select
                options={documentTypes.map((t) => ({ value: t.id, label: t.name }))}
                value={documentTypes.find((t) => t.id === uploadForm.selectedDocType) ? { value: uploadForm.selectedDocType, label: documentTypes.find((t) => t.id === uploadForm.selectedDocType)?.name } : null}
                onChange={(opt: any) => setUploadForm((prev) => ({ ...prev, selectedDocType: opt ? Number(opt.value) : null }))}
                isDisabled={uploading}
                placeholder="Select a document type"
                classNamePrefix="react-select"
                styles={customSelectFieldStyles}
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <input
                type="text"
                value={uploadForm.description}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., NIC Front, Passport Photo Page"
                maxLength={45}
                disabled={uploading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{uploadForm.description.length}/45 characters</p>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
              <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${uploadForm.preview ? 'bg-amber-50 border-amber-200' : 'hover:border-amber-400 hover:bg-amber-50 border-gray-300'
                }`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full ${uploadForm.selectedFile ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {uploadForm.selectedFile ? (
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 004-4V8a4 4 0 00-4-4h-3" />
                      </svg>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">{uploadForm.selectedFile ? 'Click to change file' : 'Click to choose file'}</div>
                  <div className="text-xs text-gray-500">Supported: Images (JPG, PNG, etc.) and PDFs</div>
                </label>

                {uploadForm.preview && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-pink-200">
                      {uploadForm.selectedFile?.type.startsWith('image/') ? (
                        <img src={uploadForm.preview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 items-start justify-center">
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">File selected:</p>
                        <p className="text-xs text-gray-500 truncate">{uploadForm.selectedFile?.name}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button
                          disabled={uploading || !uploadForm.selectedDocType || !uploadForm.description}
                          onClick={handleUpload}
                          className="flex-1 px-4 py-2 bg-amber-400 text-white rounded-lg hover:bg-amber-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                          disabled={uploading}
                          onClick={handleCancelPreview}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
        {entries.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-pink-100 text-center text-gray-500">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-pink-100">
                <div className="relative group aspect-square overflow-hidden bg-gray-100">
                  <VerificationDocumentPreview url={entry.url} title={entry.desc || 'Verification document'} />
                </div>
                <div className="p-4">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900">{entry.desc}</p>
                    <p className="text-xs text-gray-500">Type: {documentTypes.find((t) => t.id === entry.docType)?.name || 'Unknown'}</p>
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
                          disabled={!canDeleteVerificationStatus(renderStatus(entry.verificationStatusId))}
                          title={canDeleteVerificationStatus(renderStatus(entry.verificationStatusId)) ? 'Delete document' : 'Only New or Unverified documents can be deleted'}
                          aria-label={canDeleteVerificationStatus(renderStatus(entry.verificationStatusId)) ? 'Delete document' : 'Delete unavailable for this status'}
                          className="text-red-500 hover:text-red-700 transition-colors disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:text-gray-300"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-1.327L4.772 5.79m14.456 0A48.108 48.108 0 0015.75 5.5m3.478.29V4.875c0-1.18-.91-2.157-2.088-2.192a51.964 51.964 0 00-3.32 0c-1.178.035-2.088 1.011-2.088 2.192v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Change verification status</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <Select
                            options={verificationStatuses.map((status) => ({ value: status.id, label: status.name }))}
                            value={verificationStatuses.find((status) => status.id === (statusDrafts[entry.id] ?? entry.verificationStatusId))
                              ? {
                                value: statusDrafts[entry.id] ?? entry.verificationStatusId,
                                label: verificationStatuses.find((status) => status.id === (statusDrafts[entry.id] ?? entry.verificationStatusId))?.name || 'Unknown',
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
                    </div> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyDocuments;
