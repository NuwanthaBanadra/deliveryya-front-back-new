import { useState, useEffect } from 'react';

interface LocationData {
    latitude: string;
    longitude: string;
}

interface StreamMessage {
    payload: LocationData;
    receivedAt: string;
}

const normalizeLocationData = (raw: unknown): LocationData | null => {
    try {
        // Handle if raw is already a string
        let source = typeof raw === 'string' ? raw.trim() : String(raw).trim();
        
        // Remove any "data:" prefix if present
        source = source.replace(/^\s*data\s*:\s*/i, '').trim();
        
        // Parse CSV format: "lat,lng"
        const parts = source.split(',').map(p => p.trim());
        
        if (parts.length !== 2) {
            return null;
        }

        const [lat, lng] = parts;
        
        // Validate as numbers
        if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            return null;
        }

        return {
            latitude: lat,
            longitude: lng,
        };
    } catch (err) {
        console.warn('Failed to parse location data:', raw, err);
        return null;
    }
};

const SSETestComponent = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [employeeId, setEmployeeId] = useState<number>(15);

    const latestData = messages.length > 0 ? messages[messages.length - 1].payload : null;

    const handleConnect = () => {
        const endpoint = `http://localhost:8080/api/v1/live-locations/subscribe?employeeId=${employeeId}`;

        setIsConnected(true);
        setError(null);
        setMessages([]);

        try {
            const eventSource = new EventSource(endpoint);

            eventSource.addEventListener('location', event => {
                const parsedData = normalizeLocationData((event as MessageEvent).data);
                if (!parsedData) {
                    console.warn('Skipped invalid SSE payload:', event.data);
                    return;
                }

                console.log('Received location:', parsedData);
                setMessages(prev => [...prev, {
                    payload: parsedData,
                    receivedAt: new Date().toLocaleTimeString(),
                }]);
            });

            eventSource.addEventListener('error', () => {
                console.error('SSE: Connection error');
                setError('Connection error - endpoint unreachable or closed');
                setIsConnected(false);
                eventSource.close();
            });

            (window as any).__sseEventSource = eventSource;
        } catch (err) {
            console.error('SSE: Failed to create EventSource:', err);
            setError('Failed to create connection');
            setIsConnected(false);
        }
    };

    const handleDisconnect = () => {
        const eventSource = (window as any).__sseEventSource;
        if (eventSource) {
            eventSource.close();
            (window as any).__sseEventSource = null;
        }
        setIsConnected(false);
    };

    const handleClearHistory = () => {
        setMessages([]);
    };

    useEffect(() => {
        return () => {
            const eventSource = (window as any).__sseEventSource;
            if (eventSource) {
                eventSource.close();
                (window as any).__sseEventSource = null;
            }
        };
    }, []);

    const mapUrl = latestData
        ? `https://www.google.com/maps?q=${latestData.latitude},${latestData.longitude}&z=15&output=embed`
        : null;

    return (
            <div className="w-full h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-black/50 backdrop-blur border-b border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-white mb-2">Live Employee Location</h1>
                    <p className="text-gray-400 text-sm">Real-time tracking via SSE stream</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Map */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative bg-gray-950 border-r border-gray-700">
                        {mapUrl ? (
                            <iframe
                                title="Live Employee Location Map"
                                src={mapUrl}
                                className="w-full h-full border-none"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">📍</div>
                                    <p className="text-gray-400 text-lg">No location data yet</p>
                                    <p className="text-gray-500 text-sm mt-2">Connect to start receiving location updates</p>
                                </div>
                            </div>
                        )}

                        {/* Live Indicator */}
                        {isConnected && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-900/80 backdrop-blur px-4 py-2 rounded-full border border-green-500">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span className="text-green-300 text-sm font-medium">LIVE</span>
                            </div>
                        )}
                    </div>

                    {/* Location Info Bar */}
                    {latestData && (
                        <div className="bg-gray-800/50 backdrop-blur border-t border-gray-700 px-6 py-4">
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Latitude</p>
                                    <p className="text-white font-mono text-lg">{latestData.latitude}°</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Longitude</p>
                                    <p className="text-white font-mono text-lg">{latestData.longitude}°</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Last Updated</p>
                                    <p className="text-white font-mono text-lg">
                                        {messages.length > 0 ? messages[messages.length - 1].receivedAt : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Controls & Feed */}
                <div className="w-80 bg-gray-800/50 backdrop-blur border-l border-gray-700 flex flex-col">
                    {/* Controls */}
                    <div className="border-b border-gray-700 p-6">
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                                Employee ID
                            </label>
                            <input
                                type="number"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(Number(e.target.value))}
                                disabled={isConnected}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:bg-gray-700/50 disabled:opacity-50 focus:outline-none focus:border-blue-500"
                                placeholder="Enter employee ID"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleConnect}
                                disabled={isConnected}
                                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm disabled:bg-gray-700 disabled:opacity-50 transition-colors"
                            >
                                {isConnected ? 'Connected' : 'Connect'}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                disabled={!isConnected}
                                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm disabled:bg-gray-700 disabled:opacity-50 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>

                        {error && (
                            <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-xs">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Message Feed */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-300">Location History</h3>
                                {messages.length > 0 && (
                                    <button
                                        onClick={handleClearHistory}
                                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 text-xs text-center">No updates yet</p>
                                </div>
                            ) : (
                                [...messages].reverse().map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-gray-700/50 border border-gray-600 rounded p-3 text-xs hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-400">#{messages.length - idx}</span>
                                            <span className="text-gray-500 text-xs">{msg.receivedAt}</span>
                                        </div>
                                        <div className="flex gap-3 font-mono text-white">
                                            <span>{msg.payload.latitude}°</span>
                                            <span className="text-gray-500">,</span>
                                            <span>{msg.payload.longitude}°</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="border-t border-gray-700 px-6 py-3 bg-gray-900/50">
                        <div className="space-y-1 text-xs">
                            <p className="text-gray-400">
                                <span className="text-gray-500">Messages:</span>
                                <span className="text-white ml-2 font-mono">{messages.length}</span>
                            </p>
                            <p className="text-gray-400">
                                <span className="text-gray-500">Status:</span>
                                <span className={`ml-2 font-mono ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                                    {isConnected ? '● Connected' : '○ Idle'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SSETestComponent;
