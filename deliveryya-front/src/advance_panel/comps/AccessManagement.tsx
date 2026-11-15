import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LockClosedIcon,
    ServerStackIcon,
    ShieldCheckIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';

const BASE_PATH = '/deliverYya-cloud-console/access-management';

const navItems = [
    {
        label: 'Accesses and APIs',
        to: `${BASE_PATH}/accesses`,
        icon: ServerStackIcon,
        match: '/accesses',
    },
    {
        label: 'User Roles',
        to: `${BASE_PATH}/roles`,
        icon: UserGroupIcon,
        match: '/roles',
    },
    {
        label: 'User Access',
        to: `${BASE_PATH}/users`,
        icon: LockClosedIcon,
        match: '/users',
    },
] as const;

const AccessManagement: React.FC = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen pb-8">
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] p-6 shadow-xl sm:p-8">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/10 -mb-24 -ml-24" />
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                            <ShieldCheckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Access Management</h1>
                            <p className="text-sm text-white/90 sm:text-base">Access catalog, API route links, role grants, and user expiry controls</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
                    <div className="grid grid-cols-1 sm:grid-cols-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.includes(item.match);

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive: navLinkActive }) => {
                                        const active = navLinkActive || isActive;
                                        return `flex items-center justify-center gap-2 px-4 py-4 text-center text-sm font-semibold transition-all ${
                                            active
                                                ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white'
                                                : 'border-b border-gray-200 bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-[#AC6C2A] sm:border-b-0 sm:border-r'
                                        }`;
                                    }}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                <Outlet />
            </div>
        </div>
    );
};

export default AccessManagement;
