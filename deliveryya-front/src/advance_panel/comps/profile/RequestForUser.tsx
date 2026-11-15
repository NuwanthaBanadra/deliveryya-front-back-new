import { ArrowRightIcon, CheckIcon, ClipboardDocumentListIcon, DocumentArrowUpIcon, PaperClipIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import axiosInstance from '../../../util/AxiosUtil';
import {
  getRequestSelectStyles,
  getSelectPortalTarget,
  loadRequestTypes,
  toRequestTypeOptions,
  type RequestType,
  type SelectOption,
} from './userRequestUtils';

type RequestForUserProps = {
  onClose?: () => void;
  onSubmitted?: () => void;
};

function RequestForUser({ onClose, onSubmitted }: RequestForUserProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [types, setTypes] = useState<RequestType[]>([]);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadTypes = async () => {
      try {
        setTypes(await loadRequestTypes());
      } catch (err) {
        console.error('Failed to load request types', err);
      }
    };
    void loadTypes();
  }, []);

  const triggerFile = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    const canAdd = Math.max(0, 3 - files.length);
    
    if (chosen.length > canAdd) {
      setError(`Maximum 3 documents allowed. You can upload ${canAdd} more file(s).`);
      setFiles((prev) => [...prev, ...chosen.slice(0, canAdd)]);
    } else {
      setError('');
      setFiles((prev) => [...prev, ...chosen]);
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const uploadFiles = async (filesToUpload: File[]) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      filesToUpload.forEach((f) => form.append('files', f));
      const res = await axiosInstance.post('/storage/upload?path=user-requests', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data && (res.data.message === 'Success' || res.data.message === 'success')) {
        const uploaded: string[] = Array.isArray(res.data.object) ? res.data.object : [];
        return uploaded;
      }
      throw new Error(res.data?.desc || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!desc.trim()) {
      setError('Description is required');
      return;
    }
    if (!selectedType) {
      setError('Please select a request type');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const uploadedPaths = files.length ? await uploadFiles(files) : [];
      const payload = {
        title: title.trim(),
        desc: desc.trim(),
        userRequestTypeId: selectedType,
        docUrls: uploadedPaths,
      };

      await axiosInstance.post('/users/set-user-request', payload);
      setSuccess('User request submitted successfully');
      onSubmitted?.();
      setTitle('');
      setDesc('');
      setFiles([]);
      setSelectedType(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.desc || err?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOptions: SelectOption<number>[] = toRequestTypeOptions(types);
  const selectedOption = selectedType ? selectOptions.find((opt) => opt.value === selectedType) : null;
  const selectedTypeName = selectedOption?.label ?? 'Select a request type';

  const selectedFileNames = files.slice(0, 4);

  return (
    <div className="bg-white">
      <div className="bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] px-6 py-6 sm:px-8 sm:py-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-white/10 -mr-28 -mt-28" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/10 -ml-20 -mb-20" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <ClipboardDocumentListIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">Create User Request</h1>
                <p className="text-sm text-white/90 sm:text-base">Submit a new request and attach the verification documents the team should review.</p>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Close request form"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">
        {(error || success) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
              }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:auto-rows-fr">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#F59B0F]/10 p-3 text-[#F59B0F]">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Request Details</h2>
                <p className="text-sm text-gray-500">Keep the title short and the description clear.</p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5 flex-1">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Business License Verification"
                  className="h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Explain what needs to be reviewed and why..."
                  className="min-h-36 w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Request Type</label>
                <Select<SelectOption<number>, false>
                  options={selectOptions}
                  value={selectedOption}
                  onChange={(option) => {
                    setSelectedType(option?.value ?? null);
                    setError('');
                  }}
                  placeholder="Select request type..."
                  isSearchable
                  isClearable
                  menuPortalTarget={getSelectPortalTarget()}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={getRequestSelectStyles<SelectOption<number>>()}
                />
                <p className="mt-2 text-xs text-gray-500">Choose the request category the admin team should process.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 flex flex-col h-full">
            <div className="rounded-2xl border border-gray-200 bg-linear-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 sm:p-5 md:p-6 shadow-sm flex flex-col min-h-[300px] max-h-[50%] lg:max-h-none">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-white p-3 text-[#F59B0F] shadow-sm ring-1 ring-[#F59B0F]/15">
                  <DocumentArrowUpIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Verification Documents</h2>
                  <p className="text-sm text-gray-500">Upload multiple files. Each uploaded path is sent as a docUrls entry.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerFile}
                disabled={files.length >= 3}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#F59B0F]/35 bg-white/75 px-4 py-8 text-sm font-semibold text-gray-700 transition hover:border-[#F59B0F] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F59B0F] text-white shadow-lg shadow-[#F59B0F]/20">
                  <DocumentArrowUpIcon className="h-6 w-6" />
                </span>
                <span className="text-left">
                  <span className="block text-base font-bold text-gray-900">Upload documents</span>
                  <span className="block text-sm text-gray-500">PNG, JPG, PDF, and other common file types</span>
                </span>
              </button>

              <input ref={fileRef} type="file" multiple onChange={onFileChange} className="hidden" aria-label="Upload verification documents" title="Upload verification documents" />

              <div className="mt-4 space-y-3 flex-1 overflow-y-auto scrollbar-hide">
                {selectedFileNames.length > 0 ? (
                  selectedFileNames.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          {file.type?.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-500"> 
                              <PaperClipIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">Document {index + 1}</p>
                            <p className="text-xs text-gray-500">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          aria-label={`Remove ${file.name}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-8 text-center text-sm text-gray-500">
                    No documents selected yet.
                  </div>
                )}

                {files.length > selectedFileNames.length && (
                  <p className="text-xs font-medium text-gray-500">
                    +{files.length - selectedFileNames.length} more file{files.length - selectedFileNames.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm flex flex-col flex-1 min-h-[250px]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-3 text-green-600 ring-1 ring-inset ring-green-200">
                  <CheckIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Submission Preview</h3>
                  <p className="text-sm text-gray-500">Your request will be created with the chosen type and uploaded document paths.</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold text-gray-900">{selectedTypeName}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Documents</span>
                  <span className="font-semibold text-gray-900">{files.length}</span>
                </div>
                {/* <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">Upload target</span>
                  <span className="font-semibold text-gray-900">docUrls</span>
                </div> */}
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 flex-shrink-0">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#F59B0F]/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : isUploading ? 'Uploading...' : 'Submit Request'}
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestForUser;
