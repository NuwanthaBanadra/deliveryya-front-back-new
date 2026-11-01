import { FaStar } from "react-icons/fa";
import { Link } from "react-router-dom";

interface RelatedProduct {
    id: number;
    title: string;
    price: string;
    oldPrice: string;
    rating: number;
    img: string;
    discount: string;
}

interface RelatedProductsProps {
    products: RelatedProduct[];
}

function RelatedProducts({ products }: RelatedProductsProps) {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <FaStar
                key={i}
                className={`${i < Math.floor(rating) ? "text-[#FFB84D]" : "text-gray-300"}`}
            />
        ));
    };

    return (
        <div>
            <div className="text-center mb-8 px-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    You May Also <span className="text-transparent bg-clip-text bg-linear-to-r from-[#EA580C] via-[#F59B0F] to-[#FBBF24]">Like</span>
                </h2>
                <p className="text-gray-600 text-base sm:text-lg">Customers who viewed this item also viewed</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.map((item) => (
                    <Link
                        key={item.id}
                        to={`/product-details/${item.id}`}
                        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-[#F59B0F]/20 transform hover:-translate-y-2 transition-all duration-300"
                    >
                        {/* Image */}
                        <div className="relative overflow-hidden h-48 sm:h-56 bg-gray-100">
                            <img
                                src={item.img}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute top-3 right-3 bg-linear-to-r from-[#DC2626] via-[#EA580C] to-[#F59B0F] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                -{item.discount}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-[#C2410C] group-hover:to-[#F59B0F] transition-all line-clamp-2">
                                {item.title}
                            </h3>
                            <div className="flex gap-1 mb-2">
                                {renderStars(item.rating)}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-[#C2410C] to-[#F59B0F]">{item.price}</span>
                                <span className="text-sm text-gray-400 line-through">{item.oldPrice}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default RelatedProducts;
