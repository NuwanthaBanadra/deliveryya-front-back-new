import { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaExpand } from "react-icons/fa";

interface ProductImageGalleryProps {
    images: string[];
    title: string;
}

function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    if (!images || images.length === 0) {
        return (
            <div className="aspect-square bg-linear-to-br from-[#FFF8E7] to-[#FEF3C7] rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-dashed border-[#FBBF24]/40">
                <span className="text-gray-400 text-sm">No images available</span>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Main Image */}
            <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden group border border-[#FBBF24]/20">
                <div className="aspect-square relative">
                    <img
                        src={images[selectedImage]}
                        alt={title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                            zoomed ? "scale-150 cursor-zoom-out" : "group-hover:scale-105 cursor-zoom-in"
                        }`}
                        onClick={() => setZoomed(!zoomed)}
                    />

                    {/* Expand hint */}
                    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                        <FaExpand className="text-sm" />
                    </div>

                    {/* Image count pill */}
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 sm:px-3 py-1.5 rounded-full font-medium">
                        {selectedImage + 1} / {images.length}
                    </div>

                    {/* Image Navigation */}
                    {images.length > 1 && (
                        <>
                            <button
                                type="button"
                                title="Previous image"
                                aria-label="Previous image"
                                onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)}
                                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-full shadow-lg hover:bg-white hover:shadow-[#F59B0F]/30 hover:shadow-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 border border-[#FBBF24]/30"
                            >
                                <FaChevronLeft className="text-[#C2410C] text-sm" />
                            </button>
                            <button
                                type="button"
                                title="Next image"
                                aria-label="Next image"
                                onClick={() => setSelectedImage((selectedImage + 1) % images.length)}
                                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-full shadow-lg hover:bg-white hover:shadow-[#F59B0F]/30 hover:shadow-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 border border-[#FBBF24]/30"
                            >
                                <FaChevronRight className="text-[#C2410C] text-sm" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setSelectedImage(idx); setZoomed(false); }}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                            selectedImage === idx
                                ? "border-[#F59B0F] shadow-[0_0_16px_rgba(245,155,15,0.5)] scale-105 ring-2 ring-[#FBBF24]/50"
                                : "border-gray-200 hover:border-[#FCD34D] opacity-60 hover:opacity-100 hover:scale-105"
                        }`}
                    >
                        <img
                            src={img}
                            alt={`${title} view ${idx + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ProductImageGallery;
