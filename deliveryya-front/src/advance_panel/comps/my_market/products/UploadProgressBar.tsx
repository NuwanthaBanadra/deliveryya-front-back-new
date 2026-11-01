import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UploadProgressBarProps {
  currentFile: number;
  totalFiles: number;
  progress: number; // 0-100
  fileName: string;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

const UploadProgressBar = ({
  currentFile,
  totalFiles,
  progress,
  fileName,
  status,
  errorMessage,
}: UploadProgressBarProps) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-md mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          {status === 'queued' ? 'Images Ready to Upload' : 'Uploading Images'}
        </h3>
        {status !== 'queued' && (
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            {currentFile}/{totalFiles}
          </span>
        )}
      </div>

      {/* File Name */}
      <p className="text-sm text-gray-700 mb-2 truncate">
        <span className="text-gray-600">File: </span>
        {fileName}
      </p>

      {/* Progress Bar Container */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-semibold text-amber-600">{status === 'queued' ? '0' : progress}%</span>
        </div>
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'error'
                ? 'bg-red-500'
                : status === 'completed'
                  ? 'bg-green-500'
                  : status === 'queued'
                    ? 'bg-blue-400'
                    : 'bg-linear-to-r from-amber-400 to-amber-600'
            }`}
            style={{ width: `${status === 'queued' ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center gap-2 mt-3">
        {status === 'queued' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-gray-600">Ready to upload. Click "Publish Product" to start.</span>
          </div>
        )}

        {status === 'uploading' && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-gray-600">Uploading...</span>
            </div>
          </>
        )}

        {status === 'completed' && (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-xs text-green-600 font-medium">Uploaded successfully</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-600 font-medium">Upload failed</p>
              {errorMessage && (
                <p className="text-xs text-red-500 mt-0.5">{errorMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overall Progress */}
      {status !== 'queued' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Overall Progress</span>
            <span className="text-xs font-semibold text-gray-700">
              {Math.round((currentFile / totalFiles) * 100)}%
            </span>
          </div>
          <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-linear-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentFile / totalFiles) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgressBar;
