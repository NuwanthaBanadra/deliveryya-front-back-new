import jsPDF from 'jspdf';
import axiosInstance from './AxiosUtil';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};

const normalizeImageFormat = (dataUrl: string): 'PNG' | 'JPEG' => {
  if (dataUrl.startsWith('data:image/png')) {
    return 'PNG';
  }
  return 'JPEG';
};

export const buildPdfFromImages = async (imageFiles: File[], baseName: string): Promise<File> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const dataUrl = await fileToDataUrl(file);
    const imageProps = doc.getImageProperties(dataUrl);

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const widthRatio = availableWidth / imageProps.width;
    const heightRatio = availableHeight / imageProps.height;
    const ratio = Math.min(widthRatio, heightRatio);

    const renderWidth = imageProps.width * ratio;
    const renderHeight = imageProps.height * ratio;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    if (index > 0) {
      doc.addPage();
    }

    doc.addImage(dataUrl, normalizeImageFormat(dataUrl), x, y, renderWidth, renderHeight, undefined, 'FAST');
  }

  const pdfBlob = doc.output('blob');
  const timestamp = Date.now();
  return new File([pdfBlob], `${baseName}-${timestamp}.pdf`, { type: 'application/pdf' });
};

export const buildProofUploadFile = async (files: File[], baseName: string): Promise<File> => {
  if (!files.length) {
    throw new Error('Please attach at least one payment proof file.');
  }

  const validTypes = files.every((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
  if (!validTypes) {
    throw new Error('Only image files and PDF files are allowed.');
  }

  if (files.length === 1) {
    return files[0];
  }

  const allImages = files.every((file) => file.type.startsWith('image/'));
  if (!allImages) {
    throw new Error('When selecting multiple files, please choose only images.');
  }

  return buildPdfFromImages(files, baseName);
};

export const uploadProofToStorage = async (
  file: File,
  path = 'payment-proofs',
  onProgress?: (progress: number) => void,
): Promise<string> => {
  const formData = new FormData();
  formData.append('files', file);

  const response = await axiosInstance.post(`/storage/upload?path=${encodeURIComponent(path)}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (!onProgress || !progressEvent.total) {
        return;
      }

      const nextProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(Math.min(99, Math.max(0, nextProgress)));
    },
  });

  if (response.data && (response.data.message === 'Success' || response.data.message === 'success')) {
    const uploadedPaths: string[] = Array.isArray(response.data.object) ? response.data.object : [];
    if (!uploadedPaths.length) {
      throw new Error('No proof path returned from upload service.');
    }

    onProgress?.(100);
    return uploadedPaths[0];
  }

  throw new Error(response.data?.desc || 'Proof upload failed.');
};
