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
            <div className="aspect-[4/3] lg:aspect-square bg-[#FFF8F2] rounded-2xl sm:rounded-3xl flex items-center justify-center border border-dashed border-orange-200">
                <span className="text-gray-400 text-sm">No images available</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col-reverse gap-3 sm:gap-4 lg:flex-row">
            {/* Main Image */}
            <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-orange-100 bg-[#FFFBF7] shadow-sm group sm:rounded-3xl">
                <div className="aspect-[4/3] lg:aspect-square relative">
                    <img
                        src={images[selectedImage]}
                        alt={title}
                        className={`w-full h-full object-contain p-2 transition-transform duration-500 ${
                            zoomed ? "scale-150 cursor-zoom-out" : "group-hover:scale-[1.03] cursor-zoom-in"
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
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:w-20 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setSelectedImage(idx); setZoomed(false); }}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 sm:w-18 sm:h-18 lg:h-20 lg:w-20 ${
                            selectedImage === idx
                                ? "border-[#F59B0F] shadow-[0_6px_18px_rgba(245,155,15,0.20)] ring-2 ring-orange-100"
                                : "border-gray-100 opacity-70 hover:border-orange-300 hover:opacity-100"
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
