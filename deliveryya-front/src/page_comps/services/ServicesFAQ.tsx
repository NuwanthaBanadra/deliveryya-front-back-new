import { useState } from "react";
import { MdExpandMore } from "react-icons/md";

const ServicesFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How fast can DeliveryYa deliver?",
      answer:
        "Most orders are delivered within 30-60 minutes. For urgent jobs, we can complete delivery in as little as 15 minutes. Our express service is available in major cities.",
      bgClass: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      question: "Is my payment information secure?",
      answer:
        "Yes, we use bank-level encryption (256-bit SSL) for all transactions. We support multiple payment methods including credit/debit cards, digital wallets, and cash on delivery. All payments are PCI DSS compliant.",
      bgClass: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      question: "What happens if my order is late?",
      answer:
        "We maintain a 99.8% on-time delivery rate. If your order is late, you'll automatically receive a refund or credit. You can track your order in real-time to know exactly when it will arrive.",
      bgClass: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    {
      question: "Can I cancel or modify my order?",
      answer:
        "You can cancel orders free of charge before the delivery partner picks up your order. After pickup, a cancellation fee may apply. Order modifications are available within the first 5 minutes of booking.",
      bgClass: "bg-gradient-to-br from-orange-500 to-orange-600",
    },
    {
      question: "Do you deliver to all areas?",
      answer:
        "We currently deliver to 50+ cities across Sri Lanka, with plans to expand to more areas soon. Check your area's availability in the app. You can also request delivery to your area, and we'll prioritize it.",
      bgClass: "bg-gradient-to-br from-red-500 to-red-600",
    },
    {
      question: "How can I contact customer support?",
      answer:
        "Our 24/7 customer support team is available via in-app chat, phone, and email. Average response time is under 2 minutes. We support multiple languages including Sinhala, Tamil, and English.",
      bgClass: "bg-gradient-to-br from-pink-500 to-pink-600",
    },
  ];

  return (
    <section className="relative py-20 px-4 bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A]">
              Questions
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Find answers to common questions about our services
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-gray-200 hover:border-[#F59B0F]/30 transition-all duration-300 shadow-sm hover:shadow-lg"
              style={{
                animation: `slideInUp 0.6s ease-out forwards`,
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === idx ? null : idx)
                }
                className={`w-full p-6 text-left transition-all duration-300 ${openIndex === idx
                    ? faq.bgClass + " text-white"
                    : "bg-white hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg font-bold transition-colors duration-300 ${openIndex === idx
                        ? "text-white"
                        : "text-gray-900 group-hover:text-[#F59B0F]"
                      }`}
                  >
                    {faq.question}
                  </h3>
                  <MdExpandMore
                    className={`w-6 h-6 transition-transform duration-300 ${openIndex === idx
                        ? "rotate-180 text-white"
                        : "text-gray-400"
                      }`}
                  />
                </div>
              </button>

              {/* Answer - Smooth Expand/Collapse */}
              {openIndex === idx && (
                <div className="bg-white border-t border-gray-200 px-6 py-6 animate-slideDown">
                  <p className="text-gray-700 leading-relaxed text-base">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">
            Didn't find what you're looking for?
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#F59B0F] to-[#AC6C2A] shadow-lg hover:shadow-xl hover:from-[#AC6C2A] hover:to-[#8B5A28] transform hover:scale-105 transition-all duration-300">
            <span>Contact Support</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServicesFAQ;
