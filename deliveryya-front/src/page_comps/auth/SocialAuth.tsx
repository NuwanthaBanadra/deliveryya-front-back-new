import { FaGoogle, FaFacebookF, FaApple } from 'react-icons/fa';

function SocialAuth() {
    const handleSocialLogin = (provider: string) => {
        console.log(`Login with ${provider}`);
    };

    return (
        <div className="grid grid-cols-3 gap-3">
            <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-[#FF6B35] hover:bg-[#FFF4EE] text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-md group"
            >
                <FaGoogle className="w-5 h-5 text-gray-600 group-hover:text-[#FF6B35] transition-colors" />
            </button>
            
            <button
                type="button"
                onClick={() => handleSocialLogin('Facebook')}
                className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-[#FF8C42] hover:bg-[#FFF4EE] text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-md group"
            >
                <FaFacebookF className="w-5 h-5 text-gray-600 group-hover:text-[#FF8C42] transition-colors" />
            </button>
            
            <button
                type="button"
                onClick={() => handleSocialLogin('Apple')}
                className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-[#FFA726] hover:bg-[#FFF4EE] text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-md group"
            >
                <FaApple className="w-5 h-5 text-gray-600 group-hover:text-[#FFA726] transition-colors" />
            </button>
        </div>
    );
}

export default SocialAuth;
