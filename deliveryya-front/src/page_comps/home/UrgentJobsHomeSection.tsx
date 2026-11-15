import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const UrgentJobsHomeSection = () => {
  const navigate = useNavigate();
  const [shapeClass, setShapeClass] = useState<string>('shape-1');

  useEffect(() => {
    const shapes = ['shape-1', 'shape-2', 'shape-3', 'shape-4', 'shape-5', 'shape-6'];
    const pick = shapes[Math.floor(Math.random() * shapes.length)];
    setShapeClass(pick);
  }, []);

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 bg-yellow-100 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm">
            Urgent Jobs
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
            Need Something Done Fast?
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">We’ll handle it in minutes</span>
          </h2>

          <p className="text-gray-600 text-lg max-w-xl">
            Our Urgent Jobs service connects you with verified helpers for quick errands, deliveries, and time-sensitive tasks. Describe your task and get matched instantly — pricing is transparent and support is available 24/7.
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <li className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2" />
              <span className="text-gray-700">Fast response & assignment</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2" />
              <span className="text-gray-700">Verified, rated helpers</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2" />
              <span className="text-gray-700">Transparent pricing</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-2" />
              <span className="text-gray-700">Real-time updates</span>
            </li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() => navigate('/urgent-job')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 px-6 rounded-full shadow-md hover:shadow-xl transition-all duration-200"
            >
              Create an Urgent Job
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className={`w-full max-w-md overflow-hidden shadow-2xl ${shapeClass}`}>
            <img
              src="https://i.postimg.cc/MG2sjFs9/Whats-App-Image-2026-05-27-at-10-35-23-PM.jpg?auto=compress&cs=tinysrgb&w=1200&q=80"
              alt="Helper delivering a package quickly"
              className="w-full h-64 object-cover sm:h-80 lg:h-96 block"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default UrgentJobsHomeSection;
