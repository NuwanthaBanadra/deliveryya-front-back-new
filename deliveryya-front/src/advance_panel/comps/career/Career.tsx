import { useState } from 'react';
import {
  BriefcaseIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { UserSearch } from './UserSearch';
import { SignUpForm } from './SignUpForm';
import { EmployeeRegistrationForm } from './EmployeeRegistrationForm';
import type { UserSearchResult } from './types';

function Career() {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [newUserData, setNewUserData] = useState<{
    userId: number;
    firstName: string;
    lastName: string;
  } | null>(null);

  const activeUserId = selectedUser?.id ?? newUserData?.userId ?? null;
  const activeFirstName = selectedUser?.firstName ?? newUserData?.firstName ?? '';
  const activeLastName = selectedUser?.lastName ?? newUserData?.lastName ?? '';
  const showSignUpForm = mode === 'new' && !newUserData;
  const showUserSearch = mode === 'existing' && !newUserData;

  const handleUserSelected = (user: UserSearchResult) => {
    setMode('existing');
    setSelectedUser(user);
    setNewUserData(null);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setNewUserData(null);
  };

  const handleSignUpSuccess = (userId: number, firstName: string, lastName: string) => {
    setMode('new');
    setNewUserData({ userId, firstName, lastName });
    setSelectedUser(null);
  };

  const handleModeChange = (nextMode: 'existing' | 'new') => {
    setMode(nextMode);
    setSelectedUser(null);
    setNewUserData(null);
  };

  const handleRegistrationSuccess = () => {
    handleClearSelection();
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-linear-to-r from-[#F59B0F] via-[#FFA726] to-[#AC6C2A] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <BriefcaseIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Career Registration</h1>
            </div>
            <p className="text-white/90 text-sm sm:text-base">
              Register new employees or manage existing employee accounts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen pb-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-3 sm:p-4 mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-3">
            Registration Mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange('existing')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all duration-300 ${mode === 'existing'
                  ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]'
                }`}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Existing User
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('new')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-all duration-300 ${mode === 'new'
                  ? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-[#F59B0F]'
                }`}
            >
              <UserPlusIcon className="w-5 h-5" />
              New User
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3 px-2">
            {mode === 'existing'
              ? 'Search and select an existing account. New user registration fields are hidden in this mode.'
              : 'Create a new account first, then continue with employee registration.'}
          </p>
        </div>

        {showUserSearch && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-5 sm:p-6 mb-6">
            <UserSearch
              onUserSelected={handleUserSelected}
              onClearSelection={handleClearSelection}
              selectedUser={selectedUser}
            />
          </div>
        )}

        {showSignUpForm && (
          <SignUpForm
            onSignUpSuccess={handleSignUpSuccess}
            isLoading={false}
          />
        )}

        {/* Employee Registration Form - Show when user is selected or signed up */}
        {activeUserId && (
          <div className="mb-8">
            {/* <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
                Clear Selection
              </button>
            </div> */}
            <EmployeeRegistrationForm
              userId={activeUserId}
              firstName={activeFirstName}
              lastName={activeLastName}
              onSuccess={handleRegistrationSuccess}
              isLoading={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Career;
