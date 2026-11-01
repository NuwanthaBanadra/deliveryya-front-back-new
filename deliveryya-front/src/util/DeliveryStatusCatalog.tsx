import type { IconType } from 'react-icons';
import {
    FiCheckCircle,
    FiClock,
    FiCornerUpLeft,
    FiMapPin,
    FiPackage,
    FiRotateCcw,
    FiSettings,
    FiShield,
    FiThumbsUp,
    FiTruck,
    FiUserCheck,
} from 'react-icons/fi';

export interface DeliveryStatusRow {
    id: number;
    name: string;
}

export const DELIVERY_STATUS_MASTER = {
    table: 'delivery_status',
    rows: [
        { id: 1, name: 'Processing' },
        { id: 2, name: 'Ready To Pickup' },
        { id: 3, name: 'Brrow from Clients' },
        { id: 4, name: 'Verifing in Company' },
        { id: 5, name: 'On the way' },
        { id: 6, name: 'At Your Doorstep' },
        { id: 7, name: 'Delivered By Agent' },
        { id: 8, name: 'Returning' },
        { id: 9, name: 'Returned' },
        { id: 10, name: 'Accepted By Customer' },
    ] as DeliveryStatusRow[],
} as const;

export interface DeliveryStatusVisual {
    id: number;
    name: string;
    icon: IconType;
    aliases: string[];
    badgeClassName: string;
    nodeClassName: string;
}

const normalizeStatus = (value: string): string =>
    (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const DELIVERY_STATUS_VISUALS: DeliveryStatusVisual[] = [
    {
        id: 1,
        name: 'Processing',
        icon: FiSettings,
        aliases: ['processing', 'pending'],
        badgeClassName: 'bg-amber-100 text-amber-800',
        nodeClassName: 'bg-amber-500 ring-amber-50 group-hover:bg-amber-400',
    },
    {
        id: 2,
        name: 'Ready To Pickup',
        icon: FiPackage,
        aliases: ['ready to pickup', 'pickup'],
        badgeClassName: 'bg-orange-100 text-orange-800',
        nodeClassName: 'bg-orange-500 ring-orange-50 group-hover:bg-orange-400',
    },
    {
        id: 3,
        name: 'Brrow from Clients',
        icon: FiUserCheck,
        aliases: ['brrow from clients', 'borrow from clients', 'from clients'],
        badgeClassName: 'bg-cyan-100 text-cyan-800',
        nodeClassName: 'bg-cyan-500 ring-cyan-50 group-hover:bg-cyan-400',
    },
    {
        id: 4,
        name: 'Verifing in Company',
        icon: FiShield,
        aliases: ['verifing in company', 'verifying in company', 'verifying'],
        badgeClassName: 'bg-indigo-100 text-indigo-800',
        nodeClassName: 'bg-indigo-500 ring-indigo-50 group-hover:bg-indigo-400',
    },
    {
        id: 5,
        name: 'On the way',
        icon: FiTruck,
        aliases: ['on the way', 'delivering'],
        badgeClassName: 'bg-blue-100 text-blue-800',
        nodeClassName: 'bg-blue-500 ring-blue-50 group-hover:bg-blue-400',
    },
    {
        id: 6,
        name: 'At Your Doorstep',
        icon: FiMapPin,
        aliases: ['at your doorstep', 'doorstep'],
        badgeClassName: 'bg-violet-100 text-violet-800',
        nodeClassName: 'bg-violet-500 ring-violet-50 group-hover:bg-violet-400',
    },
    {
        id: 7,
        name: 'Delivered By Agent',
        icon: FiCheckCircle,
        aliases: ['delivered by agent', 'delivered'],
        badgeClassName: 'bg-emerald-100 text-emerald-800',
        nodeClassName: 'bg-emerald-500 ring-emerald-50 group-hover:bg-emerald-400',
    },
    {
        id: 8,
        name: 'Returning',
        icon: FiRotateCcw,
        aliases: ['returning'],
        badgeClassName: 'bg-red-100 text-red-800',
        nodeClassName: 'bg-red-500 ring-red-50 group-hover:bg-red-400',
    },
    {
        id: 9,
        name: 'Returned',
        icon: FiCornerUpLeft,
        aliases: ['returned'],
        badgeClassName: 'bg-slate-100 text-slate-800',
        nodeClassName: 'bg-slate-500 ring-slate-50 group-hover:bg-slate-400',
    },
    {
        id: 10,
        name: 'Accepted By Customer',
        icon: FiThumbsUp,
        aliases: ['accepted by customer', 'accepted'],
        badgeClassName: 'bg-green-100 text-green-800',
        nodeClassName: 'bg-green-600 ring-green-50 group-hover:bg-green-500',
    },
];

const FALLBACK_VISUAL: DeliveryStatusVisual = {
    id: 0,
    name: 'Unknown',
    icon: FiClock,
    aliases: ['unknown'],
    badgeClassName: 'bg-slate-100 text-slate-700',
    nodeClassName: 'bg-slate-500 ring-slate-50 group-hover:bg-slate-400',
};

export function getDeliveryStatusVisual(statusName: string): DeliveryStatusVisual {
    const normalized = normalizeStatus(statusName);

    if (!normalized) {
        return FALLBACK_VISUAL;
    }

    const exact = DELIVERY_STATUS_VISUALS.find((item) => normalizeStatus(item.name) === normalized);
    if (exact) {
        return exact;
    }

    const aliasMatch = DELIVERY_STATUS_VISUALS.find((item) =>
        item.aliases.some((alias) => {
            const aliasNormalized = normalizeStatus(alias);
            return normalized.includes(aliasNormalized) || aliasNormalized.includes(normalized);
        })
    );

    return aliasMatch || FALLBACK_VISUAL;
}
