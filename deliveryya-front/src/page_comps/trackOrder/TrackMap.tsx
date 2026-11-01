import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TbTruckDelivery } from 'react-icons/tb';
import { MdLocationOn, MdAccessTime } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';

// Fix default Leaflet icon URLs
const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Orange truck marker SVG for current location
const truckMarkerHtml = `
  <div style="
    background: linear-gradient(135deg, #F59B0F, #AC6C2A);
    width: 48px; height: 48px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 16px rgba(245,155,15,0.5);
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="transform: rotate(45deg); color: white; font-size: 20px;">🚚</div>
  </div>
`;

const destinationMarkerHtml = `
  <div style="
    background: linear-gradient(135deg, #AC6C2A, #8B5A28);
    width: 40px; height: 40px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 16px rgba(172,108,42,0.5);
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="transform: rotate(45deg); color: white; font-size: 18px;">📍</div>
  </div>
`;

const truckIcon = L.divIcon({
    html: truckMarkerHtml,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
});

const destinationIcon = L.divIcon({
    html: destinationMarkerHtml,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

// Demo order data keyed by code
interface OrderData {
    origin: [number, number];
    current: [number, number];
    destination: [number, number];
    eta: string;
    courier: string;
    phone: string;
    status: string;
    progress: number;
}

const DEMO_ORDERS: Record<string, OrderData> = {
    'DYA-2024-001234': {
        origin: [6.9271, 79.8612],
        current: [6.9500, 79.8850],
        destination: [7.0873, 80.0144],
        eta: '~25 minutes',
        courier: 'Kasun Perera',
        phone: '+94 77 123 4567',
        status: 'On The Way',
        progress: 65,
    },
};

const DEFAULT_ORDER: OrderData = {
    origin: [6.9271, 79.8612],
    current: [6.9500, 79.8850],
    destination: [7.0873, 80.0144],
    eta: '~25 minutes',
    courier: 'Kasun Perera',
    phone: '+94 77 123 4567',
    status: 'On The Way',
    progress: 65,
};

function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 1) {
            map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
        }
    }, [map, positions]);
    return null;
}

interface TrackMapProps {
    orderCode: string;
}

function TrackMap({ orderCode }: TrackMapProps) {
    const order: OrderData = DEMO_ORDERS[orderCode] ?? DEFAULT_ORDER;

    const routePositions = useMemo<[number, number][]>(
        () => [order.origin, order.current, order.destination],
        [order]
    );

    const donePositions = useMemo<[number, number][]>(
        () => [order.origin, order.current],
        [order]
    );

    const remainingPositions = useMemo<[number, number][]>(
        () => [order.current, order.destination],
        [order]
    );

    return (
        <section className="bg-white py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white px-6 py-2 rounded-full mb-4 shadow-lg">
                        <TbTruckDelivery className="w-5 h-5" />
                        <span className="text-sm font-bold">Live Delivery Map</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                        Order{' '}
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]">
                            {orderCode}
                        </span>
                    </h2>
                    <div className="mt-4 w-20 h-1 bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Map */}
                    <div className="lg:col-span-2 rounded-3xl overflow-hidden shadow-2xl border border-orange-100 h-105 md:h-120">
                        <MapContainer
                            center={order.current}
                            zoom={12}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <FitBounds positions={routePositions} />

                            {/* Origin marker */}
                            <Marker position={order.origin} icon={defaultIcon} />

                            {/* Current (truck) marker */}
                            <Marker position={order.current} icon={truckIcon} />

                            {/* Destination marker */}
                            <Marker position={order.destination} icon={destinationIcon} />

                            {/* Completed route - solid amber */}
                            <Polyline
                                positions={donePositions}
                                pathOptions={{ color: '#F59B0F', weight: 5, opacity: 1 }}
                            />

                            {/* Remaining route - dashed brown */}
                            <Polyline
                                positions={remainingPositions}
                                pathOptions={{ color: '#AC6C2A', weight: 4, opacity: 0.6, dashArray: '10, 8' }}
                            />
                        </MapContainer>
                    </div>

                    {/* Side Info Panel */}
                    <div className="space-y-5">
                        {/* Status Card */}
                        <div className="relative bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] rounded-3xl p-6 text-white shadow-xl overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full"></div>
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full"></div>
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-3">
                                    <TbTruckDelivery className="w-8 h-8" />
                                    <div>
                                        <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Status</p>
                                        <p className="text-xl font-black">{order.status}</p>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="bg-white/30 rounded-full h-2.5 mt-4">
                                    <div
                                        className="bg-white rounded-full h-2.5 transition-all duration-700"
                                        style={{ width: `${order.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-white/80 text-xs mt-1.5 font-medium">{order.progress}% to destination</p>
                            </div>
                        </div>

                        {/* ETA Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-3 bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] rounded-xl text-white">
                                    <MdAccessTime className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Estimated Arrival</p>
                                    <p className="text-2xl font-black text-gray-900">{order.eta}</p>
                                </div>
                            </div>
                        </div>

                        {/* Courier Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#F59B0F] to-[#AC6C2A] flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                                    {order.courier.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Your Courier</p>
                                    <p className="text-lg font-black text-gray-900">{order.courier}</p>
                                    <p className="text-[#F59B0F] text-sm font-semibold">{order.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Destination Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100">
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-linear-to-br from-[#AC6C2A] to-[#8B5A28] rounded-xl text-white shrink-0">
                                    <MdLocationOn className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Delivery Address</p>
                                    <p className="text-gray-800 font-bold text-sm mt-1 leading-relaxed">
                                        Lat {order.destination[0].toFixed(4)}, Lng {order.destination[1].toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Delivered check */}
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
                            <FaCheckCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-semibold">Package in transit — no action required</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default TrackMap;
