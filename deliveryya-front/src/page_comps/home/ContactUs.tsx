import { useState } from 'react';
import { MdEmail, MdPhone, MdLocationOn, MdSend, MdAccessTime } from 'react-icons/md';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { BiSupport } from 'react-icons/bi';
import { TbTruckDelivery } from 'react-icons/tb';
import { IoRocketSharp } from 'react-icons/io5';

const WHATSAPP_NUMBER = '94777468384';

function ContactUs() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const messageLines = [
            'Hello Deliveryya team,',
            '',
            `Name: ${formData.name}`,
            `Email: ${formData.email}`,
            `Phone: ${formData.phone || 'N/A'}`,
            `Subject: ${formData.subject}`,
            '',
            'Message:',
            formData.message,
        ];

        const whatsappMessage = encodeURIComponent(messageLines.join('\n'));
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const contactMethods = [
        {
            icon: <MdPhone className="w-7 h-7" />,
            title: "Call Us Anytime",
            info: "+1 (123) 456-7890",
            subInfo: "Available 24/7",
            bgGradient: "from-[#F59B0F] to-[#AC6C2A]"
        },
        {
            icon: <MdEmail className="w-7 h-7" />,
            title: "Email Support",
            info: "support@deliveryya.com",
            subInfo: "Quick Response",
            bgGradient: "from-[#AC6C2A] to-[#8B5A28]"
        },
        {
            icon: <BiSupport className="w-7 h-7" />,
            title: "Live Chat",
            info: "Chat with our team",
            subInfo: "Instant Help",
            bgGradient: "from-orange-500 to-[#F59B0F]"
        }
    ];

    return (
        <section className="relative bg-linear-to-b from-white via-gray-50 to-white py-20 overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-10 w-72 h-72 bg-[#F59B0F] rounded-full blur-3xl opacity-10"></div>
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#AC6C2A] rounded-full blur-3xl opacity-10"></div>
            </div>

            {/* <div className="relative max-w-480 mx-auto px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32"> */}
            <div className="relative max-w-7xl mx-auto px-4 ">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-6 shadow-lg">
                        <IoRocketSharp className="w-5 h-5" />
                        <span className="text-sm font-bold">Get In Touch</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6">
                        Let's Start a <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">Conversation</span>
                    </h2>
                    <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                        Have questions about our delivery service? Need help with an order? Our team is here to assist you every step of the way.
                    </p>
                </div>

                {/* Contact Methods Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {contactMethods.map((method, index) => (
                        <div
                            key={index}
                            className="group relative"
                        >
                            <div
                                className={`absolute -inset-4 bg-linear-to-br ${method.bgGradient} rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`}
                            ></div>

                            <div className="relative bg-linear-to-br from-white to-gray-50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden group-hover:pb-24">
                                <div
                                    className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${method.bgGradient} rounded-full opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-500`}
                                ></div>

                                <div className="relative mb-6">
                                    <div
                                        className={`absolute inset-0 bg-linear-to-br ${method.bgGradient} rounded-2xl animate-pulse opacity-20`}
                                    ></div>
                                    <div
                                        className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br ${method.bgGradient} text-white shadow-lg transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}
                                    >
                                        {method.icon}
                                    </div>
                                </div>

                                <div
                                    className={`inline-block mb-3 px-3 py-1 rounded-full bg-linear-to-r ${method.bgGradient} bg-opacity-10 text-xs font-bold text-[#FF6B35]`}
                                >
                                    {method.subInfo}
                                </div>

                                <h3 className="text-2xl font-black text-gray-900 mb-3">
                                    {method.title}
                                </h3>

                                <div className="flex items-center gap-2 mb-0">
                                    <div
                                        className={`w-2 h-2 rounded-full bg-linear-to-r ${method.bgGradient}`}
                                    ></div>
                                    <p className="text-gray-900 font-bold text-base">{method.info}</p>
                                </div>

                                {/* Hidden button that appears with animation */}
                                <div className="absolute left-0 right-0 bottom-0 h-0 group-hover:h-20 transition-all duration-1500 ease-out overflow-hidden mb-3">
                                    <div className="h-full flex items-center justify-center px-5 animate-in slide-in-from-bottom-4">
                                        <button
                                            className={`w-full py-3 rounded-xl bg-linear-to-r ${method.bgGradient} text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-500`}
                                        >
                                            Learn More →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>

                {/* Main Content - Split Layout */}
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Contact Form - Takes 3 columns */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-linear-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <MdSend className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Send us a Message</h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#F59B0F] focus:outline-hidden transition-all bg-gray-50 focus:bg-white"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#AC6C2A] focus:outline-hidden transition-all bg-gray-50 focus:bg-white"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#AC6C2A] focus:outline-hidden transition-all bg-gray-50 focus:bg-white"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        How can we help? *
                                    </label>
                                    <select
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#AC6C2A] focus:outline-hidden transition-all bg-gray-50 focus:bg-white"
                                    >
                                        <option value="">Choose a topic</option>
                                        <option value="general">General Question</option>
                                        <option value="support">Order Support</option>
                                        <option value="delivery">Delivery Issue</option>
                                        <option value="partnership">Business Partnership</option>
                                        <option value="feedback">Feedback & Suggestions</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Your Message *
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows={6}
                                        className="w-full px-5 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#AC6C2A] focus:outline-hidden transition-all resize-none bg-gray-50 focus:bg-white"
                                        placeholder="Tell us more about your inquiry..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] hover:from-[#AC6C2A] hover:to-[#8B5A28] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg"
                                >
                                    <span>Send Message</span>
                                    <MdSend className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Info Sidebar - Takes 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Office Location Card */}
                        <div className="bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] rounded-3xl p-8 text-white shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <TbTruckDelivery className="w-8 h-8" />
                                <h3 className="text-2xl font-bold">Visit Our HQ</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <MdLocationOn className="w-6 h-6 mt-1 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Main Office</p>
                                        <p className="text-sm opacity-90">123 Delivery Street</p>
                                        <p className="text-sm opacity-90">Business District, NY 10001</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <MdAccessTime className="w-6 h-6 mt-1 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Office Hours</p>
                                        <p className="text-sm opacity-90">Mon - Fri: 9:00 AM - 6:00 PM</p>
                                        <p className="text-sm opacity-90">Weekend: Closed</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-6 bg-white text-[#FF6B35] font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
                                Get Directions →
                            </button>
                        </div>

                        {/* Social Media Card */}
                        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl">
                            <h3 className="text-2xl font-bold mb-4">Connect With Us</h3>
                            <p className="text-gray-400 mb-6">Follow us for updates, promotions, and delivery tips!</p>
                            <div className="grid grid-cols-2 gap-3">
                                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-[#FF8C42] p-4 rounded-xl transition-all duration-300 group">
                                    <FaFacebookF className="w-5 h-5" />
                                    <span className="font-semibold text-sm">Facebook</span>
                                </a>
                                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-[#FF8C42] p-4 rounded-xl transition-all duration-300 group">
                                    <FaTwitter className="w-5 h-5" />
                                    <span className="font-semibold text-sm">Twitter</span>
                                </a>
                                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-[#FF8C42] p-4 rounded-xl transition-all duration-300 group">
                                    <FaInstagram className="w-5 h-5" />
                                    <span className="font-semibold text-sm">Instagram</span>
                                </a>
                                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-[#FF8C42] p-4 rounded-xl transition-all duration-300 group">
                                    <FaLinkedinIn className="w-5 h-5" />
                                    <span className="font-semibold text-sm">LinkedIn</span>
                                </a>
                            </div>
                        </div>

                        {/* Quick Help Card */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Need Quick Help?</h3>
                            <div className="space-y-3">
                                <a href="#" className="flex items-center justify-between p-3 bg-[#FFF4EE] rounded-xl hover:bg-[#FFE5D9] transition-colors group">
                                    <span className="font-semibold text-gray-900">📦 Track Order</span>
                                    <span className="text-[#FF6B35] group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                                <a href="#" className="flex items-center justify-between p-3 bg-[#FFF4EE] rounded-xl hover:bg-[#FFE5D9] transition-colors group">
                                    <span className="font-semibold text-gray-900">❓ FAQs</span>
                                    <span className="text-[#FF6B35] group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                                <a href="#" className="flex items-center justify-between p-3 bg-[#FFF4EE] rounded-xl hover:bg-[#FFE5D9] transition-colors group">
                                    <span className="font-semibold text-gray-900">💬 Live Chat</span>
                                    <span className="text-[#FF6B35] group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ContactUs;