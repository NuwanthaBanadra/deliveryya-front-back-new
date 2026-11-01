import { BsLightningFill, BsCheckCircleFill } from "react-icons/bs";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MdAccessTime, MdVerifiedUser, MdWorkspacePremium } from "react-icons/md";

const ServicesSectionUrgentJobs = () => {
  const navigate = useNavigate();
  const [shapeClass, setShapeClass] = useState<string>('shape-1');

  useEffect(() => {
    const shapes = ['shape-1', 'shape-2', 'shape-3', 'shape-4', 'shape-5', 'shape-6'];
    const pick = shapes[Math.floor(Math.random() * shapes.length)];
    setShapeClass(pick);
  }, []);

  const benefits = [
    {
      icon: <BsLightningFill className="w-5 h-5" />,
      title: "Lightning Fast",
      description: "Get tasks completed within minutes, not hours.",
    },
    {
      icon: <MdAccessTime className="w-5 h-5" />,
      title: "Flexible Timing",
      description: "Schedule jobs according to your availability.",
    },
    {
      icon: <MdVerifiedUser className="w-5 h-5" />,
      title: "Verified Helpers",
      description: "All helpers are verified and rated by customers.",
    },
    {
      icon: <MdWorkspacePremium className="w-5 h-5" />,
      title: "Premium Support",
      description: "24/7 customer support for all your urgent needs.",
    },
  ];

  return (
    <section id="urgent-jobs-service" className="relative py-20 px-4 overflow-hidden scroll-mt-28">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-200/10 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slideInLeft">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm">
              <BsLightningFill className="w-4 h-4" />
              Urgent Jobs Service
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                Get Things Done
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">
                  In Minutes
                </span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
                From quick errands to time-sensitive tasks, our Urgent Jobs service connects you with verified helpers ready to assist immediately.
              </p>
            </div>

            {/* Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 animate-slideInUp"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{benefit.title}</h4>
                    <p className="text-gray-600 text-xs">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/urgent-job')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-2"
            >
              <span>Create an Urgent Job</span>
              <BsLightningFill className="w-5 h-5" />
            </button>
          </div>

          {/* Right Visual */}
          <div className="relative h-96 md:h-full flex items-center justify-center animate-slideInRight">
            <div className="relative w-full max-w-sm">
              {/* Floating Cards */}
              {/* <div className="absolute top-0 right-0 bg-white rounded-2xl p-6 shadow-xl w-64 transform hover:scale-105 transition-transform duration-300 hover:shadow-2xl animate-bounce-slow">
                <div className="flex items-center gap-3 mb-2">
                  <BsCheckCircleFill className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-gray-900">Task Assigned</span>
                </div>
                <p className="text-sm text-gray-600">Your helper is on the way</p>
              </div>

              <div className="absolute bottom-0 left-0 bg-white rounded-2xl p-6 shadow-xl w-64 transform hover:scale-105 transition-transform duration-300 hover:shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"></div>
                  <span className="font-bold text-gray-900">₹500</span>
                </div>
                <p className="text-sm text-gray-600">Transparent pricing, no hidden fees</p>
              </div> */}

              {/* Center Image (random organic shape) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-72 h-72 md:w-96 md:h-96 lg:w-[36rem] lg:h-[36rem] overflow-hidden shadow-2xl ${shapeClass}`}>
                  <img
                    src="https://i.postimg.cc/MG2sjFs9/Whats-App-Image-2026-05-27-at-10-35-23-PM.jpg"
                    alt="Urgent job helper"
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSectionUrgentJobs;
