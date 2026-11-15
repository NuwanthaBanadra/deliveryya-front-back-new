import { useEffect, useState } from "react";
import { FaLaptop, FaMobileAlt, FaHeadphones, FaCamera, FaGamepad, FaTv, FaShoppingBag } from "react-icons/fa";
import { MdWatch, MdKeyboard, MdCategory } from "react-icons/md";
import axiosInstance from "../../util/AxiosUtil";

type ApiCategory = {
    id: number;
    name: string;
    img?: string;
    imageUrl?: string;
    markets?: {
        id: number;
    };
};

type GetCategoriesPayload = {
    pageNumber: number;
    countPerPage: number;
    marketId?: number;
    categoryId?: number | null;
    brandId?: number | null;
    search?: string;
};

type PagedResponse<T> = {
    message?: string;
    desc?: string;
    object?: {
        items?: T[];
        totalCount?: number;
        totalPages?: number;
    };
    exData?: {
        items?: T[];
        totalCount?: number;
        totalPages?: number;
    };
};

type Category = {
    id: number;
    name: string;
    icon: React.ElementType;
    count: number;
    gradient: string;
    img: string;
};

function CategoryShowcase() {
    const MARKET_ID = 1;
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Available gradients for random selection
    const gradients = [
        "from-[#FF6B35] to-[#FF8C42]",
        "from-[#00BFA5] to-[#1DE9B6]",
        "from-[#7E57C2] to-[#9575CD]",
        "from-[#FFA726] to-[#FFB84D]",
        "from-[#EF5350] to-[#E57373]",
        "from-[#5C6BC0] to-[#7986CB]",
        "from-[#FF6F91] to-[#FF9AAC]",
        "from-[#26C6DA] to-[#4DD0E1]",
        "from-[#66BB6A] to-[#81C784]",
        "from-[#AB47BC] to-[#BA68C8]",
        "from-[#FF7043] to-[#FF8A65]",
        "from-[#42A5F5] to-[#64B5F6]",
    ];

    // Visual styling mapping for categories
    const categoryVisuals: Record<string, { icon: React.ElementType; gradient: string; img: string }> = {
        default: {
            icon: MdCategory,
            gradient: "from-[#9E9E9E] to-[#BDBDBD]",
            img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80"
        }
    };

    const getRandomGradient = () => {
        return gradients[Math.floor(Math.random() * gradients.length)];
    };

    const getVisualForCategory = (name: string) => {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '');
        
        // Check for exact or partial matches
        for (const [key, visual] of Object.entries(categoryVisuals)) {
            if (normalizedName.includes(key) || key.includes(normalizedName)) {
                return visual;
            }
        }
        
        return categoryVisuals.default;
    };

    const fetchCategories = async () => {
        setIsLoading(true);
        setError(null);

        const payload: GetCategoriesPayload = {
            pageNumber: 0,
            countPerPage: 100,
            marketId: MARKET_ID,
            categoryId: null,
            brandId: null,
        };

        try {
            const response = await axiosInstance.post<PagedResponse<ApiCategory>>(
                '/products/get-categories',
                payload
            );

            const responseMessage = String(response.data.message || '').toLowerCase();
            const categoryItems = response.data.exData?.items || response.data.object?.items || [];

            if (responseMessage === 'success' && categoryItems.length > 0) {
                const mappedCategories: Category[] = categoryItems.map((category) => {
                    const visual = getVisualForCategory(category.name);
                    const categoryImage = category.img || category.imageUrl || visual.img;
                    return {
                        id: category.id,
                        name: category.name,
                        icon: visual.icon,
                        count: 0,
                        gradient: getRandomGradient(),
                        img: categoryImage,
                    };
                });

                setCategories(mappedCategories);
            } else {
                setError('No categories found.');
            }
        } catch (apiError) {
            console.error('Failed to load categories:', apiError);
            setError('Failed to load categories from backend.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <section className="bg-linear-to-b from-gray-50 to-white py-16 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Shop by <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FF6B35] to-[#FF8C42]">Category</span>
                    </h2>
                    <p className="text-gray-600 text-lg">Browse our wide range of product categories</p>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
                        <p className="text-gray-600 mt-4">Loading categories...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-red-500 text-lg">{error}</p>
                        <button 
                            onClick={fetchCategories}
                            className="mt-4 bg-[#FF6B35] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#FF8C42] transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Categories Grid */}
                {!isLoading && !error && categories.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((category, i) => {
                        const Icon = category.icon;
                        return (
                            <div
                                key={category.id}
                                className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                            >
                                {/* Background Image with Overlay */}
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={category.img}
                                        alt={category.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className={`absolute inset-0 bg-linear-to-br ${category.gradient} opacity-80 group-hover:opacity-90 transition-opacity duration-300`}></div>
                                    
                                    {/* Icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-sm p-6 rounded-full group-hover:scale-110 transition-transform duration-300">
                                            <Icon className="w-12 h-12 text-white" />
                                        </div>
                                    </div>

                                    {/* Product Count Badge */}
                                    {category.count > 0 && (
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                                            <span className="text-sm font-bold text-gray-800">{category.count}+ items</span>
                                        </div>
                                    )}
                                </div>

                                {/* Category Info */}
                                <div className="p-5 text-center">
                                    <h3 className={`text-xl font-bold bg-linear-to-r ${category.gradient} text-transparent bg-clip-text group-hover:scale-110 inline-block transition-transform duration-300`}>
                                        {category.name}
                                    </h3>
                                    <button className={`mt-3 w-full bg-linear-to-r ${category.gradient} text-white font-semibold py-2 rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300`}>
                                        Explore
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}

                {/* Featured Banner */}
                {!isLoading && (
                <div className="mt-16 relative rounded-3xl overflow-hidden shadow-2xl">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80"
                            alt="Featured"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-[#FF6B35]/95 to-[#FF8C42]/95"></div>
                    </div>
                    <div className="relative z-10 py-16 px-8 text-center text-white">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4">Can't find what you're looking for?</h3>
                        <p className="text-lg mb-8 text-white/90">Explore all categories and discover amazing products</p>
                        <button className="bg-white text-[#FF6B35] font-bold py-4 px-12 rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                            View All Categories
                        </button>
                    </div>
                </div>
                )}
            </div>
        </section>
    );
}

export default CategoryShowcase;
