import { useMemo, useState, useRef, useEffect } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import UploadProgressBar from './UploadProgressBar';
import type { ProductFormData } from './types';

interface ProductImagesProps {
  formData: ProductFormData;
  onInputChange: (field: keyof ProductFormData, value: Array<File | string>) => void;
  editMode?: boolean;
  defaultImageUrl?: string | null;
  onDefaultImageSelect?: (imageUrl: string) => void;
  allowDefaultSelection?: boolean;
  uploadProgress?: {
    isUploading: boolean;
    currentFile: number;
    totalFiles: number;
    progress: number;
    fileName: string;
    status: 'queued' | 'uploading' | 'completed' | 'error';
    errorMessage?: string;
  };
  onFilesSelected?: (fileCount: number) => void;
}


const ProductImages = ({
  formData,
  onInputChange,
  uploadProgress,
  onFilesSelected,
  defaultImageUrl,
  onDefaultImageSelect,
  allowDefaultSelection = false,
}: ProductImagesProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrls = useMemo(
    () => formData.images.map((img) => (typeof img === 'string' ? img : URL.createObjectURL(img))),
    [formData.images],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url, index) => {
        if (typeof formData.images[index] !== 'string') {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [formData.images, previewUrls]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const updatedFiles = [...formData.images, ...newFiles];
    onInputChange('images', updatedFiles);
    // Notify parent component about new files
    if (onFilesSelected && newFiles.length > 0) {
      onFilesSelected(newFiles.length);
    }
  };

  const removeImage = (index: number) => {
    const updatedFiles = formData.images.filter((_, i) => i !== index);

    onInputChange('images', updatedFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm transition-all duration-300 hover:shadow-md animate-slide-up border border-pink-100">
      <div className="p-6 border-b border-pink-100">
        <h2 className="text-xl font-semibold text-gray-800 transition-colors duration-300">
          Product Images
        </h2>
      </div>

      <div className="p-6 space-y-6">

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${dragActive
            ? 'border-purple-400 bg-purple-100 scale-[1.02]'
            : 'border-amber-200 hover:border-purple-400 hover:bg-amber-50'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleChange}
            aria-label="Upload product images"
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full transition-all duration-300 ${dragActive
              ? 'bg-purple-200'
              : 'bg-amber-100'
              }`}>
              <PhotoIcon className={`w-12 h-12 transition-colors duration-300 ${dragActive
                ? 'text-purple-600'
                : 'text-amber-400'
                }`} />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-800 mb-1">
                {dragActive ? 'Drop images here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-600">
                SVG, PNG, JPG or GIF (MAX. 800x400px)
              </p>
            </div>

            <button
              type="button"
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Browse Files
            </button>
          </div>
        </div>

        {/* Image Previews */}
        {previewUrls.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Uploaded Images ({previewUrls.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {previewUrls.map((url, index) => (
                <div
                  key={index}
                  className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                    defaultImageUrl === url
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : 'border-pink-200 hover:border-purple-400'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />

                  {defaultImageUrl === url && (
                    <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white shadow-md">
                      Default
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        aria-label="Remove image"
                        className="self-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-300 transform scale-75 group-hover:scale-100"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-xs text-white truncate">
                      {typeof formData.images[index] === 'string'
                        ? formData.images[index].split('/').pop()
                        : formData.images[index]?.name}
                    </p>
                    <p className="text-xs text-gray-300">
                      {typeof formData.images[index] === 'string'
                        ? 'Existing image'
                        : `${(formData.images[index]?.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>

                  {allowDefaultSelection && typeof formData.images[index] === 'string' && onDefaultImageSelect && (
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDefaultImageSelect(url);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-xs font-semibold shadow-md transition-colors ${
                          defaultImageUrl === url
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/95 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {defaultImageUrl === url ? 'Default Image' : 'Set as Default'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress?.isUploading && (
              <UploadProgressBar
                currentFile={uploadProgress.currentFile}
                totalFiles={uploadProgress.totalFiles}
                progress={uploadProgress.progress}
                fileName={uploadProgress.fileName}
                status={uploadProgress.status}
                errorMessage={uploadProgress.errorMessage}
              />
            )}
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 transition-colors duration-300 border border-purple-100">
          <h4 className="text-sm font-medium text-gray-800 mb-2">
            Image Guidelines
          </h4>
          {allowDefaultSelection && (
            <p className="mb-3 text-sm text-amber-700">
              Use "Set Default" on an existing image to choose the main product image shown on cards.
            </p>
          )}
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Use high-quality images with good lighting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Recommended size: 800x800px or larger</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Supported formats: JPG, PNG, GIF, SVG</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Maximum file size: 5MB per image</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductImages;
