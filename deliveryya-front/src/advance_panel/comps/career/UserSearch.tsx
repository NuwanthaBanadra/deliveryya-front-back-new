import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../../util/AxiosUtil';
import type { UserSearchResult } from './types';
import Swal from 'sweetalert2';
import { BeatLoader } from 'react-spinners';
import { IoBackspaceOutline } from 'react-icons/io5';

interface UserSearchProps {
  onUserSelected: (user: UserSearchResult) => void;
  onClearSelection: () => void;
  selectedUser: UserSearchResult | null;
  title?: string;
  description?: string;
  placeholder?: string;
}

export const UserSearch = ({
  onUserSelected,
  onClearSelection,
  selectedUser,
  title = 'Search for Existing User',
  description = 'If the person already has an account, search and select them here. Otherwise, proceed with new user registration below.',
  placeholder = 'Search by name, email, or NIC...',
}: UserSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setUsers([]);
        setShowDropdown(false);
        return;
      }

      if (skipNextSearch.current) {
        skipNextSearch.current = false;
        return;
      }

      setIsSearching(true);
      try {
        const response = await axiosInstance.post('/users/get-users', {
          pageNumber: 0,
          countPerPage: 50,
          search: searchTerm,
          isActive: true
        });
        
        const items = response.data.object?.items || [];
        setUsers(items);
        setShowDropdown(items.length > 0);
      } catch (error) {
        console.error('Error fetching users:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch users',
        });
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectUser = (user: UserSearchResult) => {
    skipNextSearch.current = true;
    onUserSelected(user);
    setSearchTerm(`${user.firstName} ${user.lastName}`);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setUsers([]);
    setShowDropdown(false);
    onClearSelection();
  };

  return (
    <div className="mb-6">
      <label className="text-xl font-semibold text-gray-800">
        {title}
      </label>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        {description}
      </p>

      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 transition-all"
          />
          {selectedUser && (
            <button
              onClick={handleClear}
              className="px-4  bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
            >
              <IoBackspaceOutline size={26}/>
            </button>
          )}
        </div>

        {/* Spinner as dropdown panel */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-amber-200 rounded-xl shadow-[0_10px_25px_-5px_rgba(245,155,15,0.2)] z-10 flex justify-center py-5">
            <BeatLoader color="#ffbf00" loading size={10} speedMultiplier={0.5} />
          </div>
        )}

        {/* Results dropdown */}
        {!isSearching && showDropdown && users.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_25px_-5px_rgba(245,155,15,0.2)] z-10 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400">NIC: {user.nic}</div>
              </button>
            ))}
          </div>
        )}

        {/* No results — only when not selected and actively searching */}
        {!isSearching && !selectedUser && searchTerm.trim().length >= 2 && users.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_25px_-5px_rgba(245,155,15,0.2)] z-10 px-4 py-4 text-sm text-gray-500 text-center">
            No users found for "<span className="font-medium text-gray-700">{searchTerm}</span>"
          </div>
        )}

        {/* Selected user badge */}
        {selectedUser && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F59B0F] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {selectedUser.firstName[0]}{selectedUser.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p className="text-xs text-gray-500">{selectedUser.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
