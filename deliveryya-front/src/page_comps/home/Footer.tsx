import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaYoutube } from "react-icons/fa";
import { MdEmail, MdPhone, MdLocationOn } from "react-icons/md";
import { TbTruckDelivery } from "react-icons/tb";
import { IoStorefront, IoShieldCheckmark } from "react-icons/io5";

const Footer = () => {
    return (
        <footer className="bg-linear-to-b from-gray-900 to-black text-white">
            {/* Main Footer Content */}
            <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <TbTruckDelivery className="w-8 h-8 text-[#F59B0F]" />
                            <h2 className="text-2xl font-bold">DeliveryYa</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Your trusted delivery partner for fast, reliable service. We bring everything you need right to your doorstep.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <a href="#" className="bg-white/10 hover:bg-gradient-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] p-3 rounded-full transition-all duration-300 hover:scale-110">
                                <FaFacebookF className="w-4 h-4" />
                            </a>
                            <a href="#" className="bg-white/10 hover:bg-gradient-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] p-3 rounded-full transition-all duration-300 hover:scale-110">
                                <FaTwitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="bg-white/10 hover:bg-gradient-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] p-3 rounded-full transition-all duration-300 hover:scale-110">
                                <FaInstagram className="w-4 h-4" />
                            </a>
                            <a href="#" className="bg-white/10 hover:bg-gradient-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] p-3 rounded-full transition-all duration-300 hover:scale-110">
                                <FaLinkedinIn className="w-4 h-4" />
                            </a>
                            <a href="#" className="bg-white/10 hover:bg-gradient-to-r hover:from-[#F59B0F] hover:to-[#AC6C2A] p-3 rounded-full transition-all duration-300 hover:scale-110">
                                <FaYoutube className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-xl font-bold mb-6 text-[#F59B0F]">Quick Links</h3>
                        <ul className="space-y-3">
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#F59B0F] hover:translate-x-1 inline-block transition-all duration-300">
                                    → About Us
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Our Services
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Track Order
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Pricing
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Contact Us
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h3 className="text-xl font-bold mb-6 text-[#AC6C2A]">Categories</h3>
                        <ul className="space-y-3">
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 transition-all duration-300 flex items-center gap-2">
                                    <IoStorefront className="w-4 h-4" /> Restaurants
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Groceries
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Electronics
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Pharmacy
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-400 hover:text-[#AC6C2A] hover:translate-x-1 inline-block transition-all duration-300">
                                    → Pet Supplies
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-xl font-bold mb-6 text-[#FF8C42]">Contact Us</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-400">
                                <MdLocationOn className="w-5 h-5 text-[#FF8C42] mt-1 shrink-0" />
                                <span>123 Delivery Street, Business District, NY 10001</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-400">
                                <MdPhone className="w-5 h-5 text-[#FF8C42] shrink-0" />
                                <a href="tel:+11234567890" className="hover:text-[#FF8C42] transition-colors">
                                    +1 (123) 456-7890
                                </a>
                            </li>
                            <li className="flex items-center gap-3 text-gray-400">
                                <MdEmail className="w-5 h-5 text-[#FF8C42] shrink-0" />
                                <a href="mailto:support@deliveryya.com" className="hover:text-[#FF8C42] transition-colors">
                                    support@deliveryya.com
                                </a>
                            </li>
                        </ul>
                        <div className="mt-6 p-4 bg-[#FF8C42]/10 border border-[#FF8C42]/30 rounded-lg">
                            <div className="flex items-center gap-2 text-[#FF8C42] mb-2">
                                <IoShieldCheckmark className="w-5 h-5" />
                                <span className="font-bold text-sm">24/7 Support</span>
                            </div>
                            <p className="text-gray-400 text-sm">We're here to help anytime</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10">
                <div className="max-w-480 mx-auto px-8 sm:px-12 lg:px-20 xl:px-32 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                        <p>
                            © {new Date().getFullYear()} <span className="text-[#FF8C42] font-bold">Deliveryya</span>. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-[#FF8C42] transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-[#FF8C42] transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-[#FF8C42] transition-colors">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
