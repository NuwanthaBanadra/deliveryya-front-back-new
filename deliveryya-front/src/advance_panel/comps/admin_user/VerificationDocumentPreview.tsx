import { useEffect, useMemo, useState } from 'react';
import { DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { baseURL } from '../../../util/AxiosUtil';

type Props = {
  url: string;
  title: string;
};

const normalizeDocumentUrl = (rawUrl?: string | null): string => {
  const cleanedUrl = rawUrl?.replace(/\\/g, '/').trim();
  if (!cleanedUrl || cleanedUrl === 'null' || cleanedUrl === 'undefined') return '';
  if (/^(https?:|data:|blob:)/i.test(cleanedUrl)) return cleanedUrl;

  const path = cleanedUrl.replace(/^\/+/, '');
  if (/^uploads(\/|$)/i.test(path)) return `${baseURL}/${path}`;
  return `${baseURL}/uploads/${path}`;
};

const looksLikePdf = (url: string, contentType?: string): boolean => {
  if (contentType?.toLowerCase().includes('pdf')) return true;
  const withoutQuery = url.split('?')[0]?.toLowerCase() || '';
  return withoutQuery.endsWith('.pdf');
};

const getFileName = (url: string, isPdf: boolean): string => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.pathname.split('/').filter(Boolean).pop() || (isPdf ? 'verification-document.pdf' : 'verification-document');
  } catch {
    return isPdf ? 'verification-document.pdf' : 'verification-document';
  }
};

const fetchDocumentBlob = async (url: string): Promise<Blob> => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error('Unable to load verification document.');
  }

  return response.blob();
};

function VerificationDocumentPreview({ url, title }: Props) {
  const resolvedUrl = useMemo(() => normalizeDocumentUrl(url), [url]);
  const [blobUrl, setBlobUrl] = useState('');
  const [isPdf, setIsPdf] = useState(() => looksLikePdf(resolvedUrl));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedUrl) {
      setBlobUrl('');
      setLoadError(null);
      setIsPdf(false);
      return;
    }

    let objectUrl = '';
    let cancelled = false;
    setLoadError(null);
    setBlobUrl('');
    setIsPdf(looksLikePdf(resolvedUrl));

    fetchDocumentBlob(resolvedUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setIsPdf(looksLikePdf(resolvedUrl, blob.type));
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Preview unavailable');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedUrl]);

  const previewUrl = blobUrl || resolvedUrl;

  const handleDownload = async () => {
    if (!resolvedUrl) return;

    try {
      const blob = await fetchDocumentBlob(resolvedUrl);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getFileName(resolvedUrl, looksLikePdf(resolvedUrl, blob.type));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!resolvedUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm font-semibold text-gray-500">
        No document URL
      </div>
    );
  }

  return (
    <>
      {isPdf ? (
        <object data={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf" className="h-full w-full">
          <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`} title={title} className="h-full w-full border-none" />
        </object>
      ) : (
        <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
      )}

      {loadError && (
        <div className="absolute left-3 top-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 shadow-sm">
          {loadError}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#F59B0F] px-3 py-2 text-xs font-bold text-white hover:bg-[#D17F0A]"
        >
          <EyeIcon className="h-4 w-4" />
          Open
        </a>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          Download
        </button>
      </div>
    </>
  );
}

export default VerificationDocumentPreview;
