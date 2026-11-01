import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiExternalLink, FiFileText, FiImage } from 'react-icons/fi';
import { baseURL } from '../../../util/AxiosUtil';

type Props = {
    proofUrl?: string | null;
    compact?: boolean;
};

const normalizeProofUrl = (url?: string | null): string => {
    const cleanedUrl = url?.trim();
    if (!cleanedUrl) return '';
    if (/^(https?:|data:|blob:)/i.test(cleanedUrl)) return cleanedUrl;
    if (cleanedUrl.startsWith('/uploads/')) return `${baseURL}${cleanedUrl}`;
    if (cleanedUrl.startsWith('/')) return `${baseURL}/uploads${cleanedUrl}`;
    return `${baseURL}/uploads/${cleanedUrl}`;
};

const isPdfUrl = (url: string): boolean => {
    const withoutQuery = url.split('?')[0]?.toLowerCase() || '';
    return withoutQuery.endsWith('.pdf') || url.toLowerCase().includes('application/pdf');
};

const getProofFileName = (url: string): string => {
    const fallback = isPdfUrl(url) ? 'payment-proof.pdf' : 'payment-proof';
    try {
        const parsedUrl = new URL(url, window.location.origin);
        const name = parsedUrl.pathname.split('/').filter(Boolean).pop();
        return name || fallback;
    } catch {
        return fallback;
    }
};

const fetchProofBlob = async (url: string): Promise<Blob> => {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
        throw new Error('Unable to load payment proof.');
    }

    return response.blob();
};

function PaymentProofPreview({ proofUrl, compact = false }: Props) {
    const normalizedUrl = useMemo(() => normalizeProofUrl(proofUrl), [proofUrl]);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
    const [isPdf, setIsPdf] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!normalizedUrl) {
            setPdfBlobUrl('');
            setIsPdf(false);
            setLoadError(null);
            return;
        }

        let objectUrl = '';
        let cancelled = false;
        const looksLikePdf = isPdfUrl(normalizedUrl);
        setIsPdf(looksLikePdf);
        setLoadError(null);
        setPdfBlobUrl('');

        if (!looksLikePdf) return;

        fetchProofBlob(normalizedUrl)
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setPdfBlobUrl(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setLoadError('Unable to preview this PDF. You can still open or download it.');
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [normalizedUrl]);

    const handleDownload = async () => {
        if (!normalizedUrl) return;

        try {
            const blob = await fetchProofBlob(normalizedUrl);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = getProofFileName(normalizedUrl);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch {
            window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (!normalizedUrl) {
        return (
            <section className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4 text-sm text-slate-500">
                No payment proof attached to this record.
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#F59B0F]">
                        {isPdf ? <FiFileText className="h-5 w-5" /> : <FiImage className="h-5 w-5" />}
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Payment Proof</p>
                        <p className="text-sm font-semibold text-slate-900">{isPdf ? 'PDF proof attached' : 'Image proof attached'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <a
                        href={pdfBlobUrl || normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-100"
                    >
                        <FiExternalLink className="h-4 w-4" />
                        Open
                    </a>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-[#AC6C2A] hover:to-[#F59B0F]"
                    >
                        <FiDownload className="h-4 w-4" />
                        Download
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {loadError}
                </div>
            )}

            {isPdf ? (
                <div className={compact ? 'h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-50' : 'h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50'}>
                    {pdfBlobUrl ? (
                        <object data={pdfBlobUrl} type="application/pdf" className="h-full w-full">
                            <iframe src={pdfBlobUrl} title="Payment proof PDF" className="h-full w-full" />
                        </object>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                            Loading PDF preview...
                        </div>
                    )}
                </div>
            ) : (
                <a href={normalizedUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                        src={normalizedUrl}
                        alt="Payment proof"
                        className={compact ? 'max-h-56 w-full rounded-xl object-contain bg-slate-50' : 'max-h-[420px] w-full rounded-xl object-contain bg-slate-50'}
                    />
                </a>
            )}
        </section>
    );
}

export default PaymentProofPreview;
