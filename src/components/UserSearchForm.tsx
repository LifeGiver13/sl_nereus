
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface UserSearchFormProps {
  onUserSelect: (user: User) => void;
  disabled?: boolean;
}

const UserSearchForm: React.FC<UserSearchFormProps> = ({ onUserSelect, disabled }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/utils/user-list/${encodeURIComponent(term)}`);
      if (response.ok) {
        const userData = await response.json();
        const userArray = Object.entries(userData).map(([id, name]) => {
          const nameParts = (name as string).split(' ');
          return {
            id: parseInt(id),
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: '' // This endpoint doesn't provide email
          };
        });
        setSearchResults(userArray);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    searchUsers(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Search by name..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <Button 
          onClick={handleSearch}
          disabled={disabled || !searchTerm.trim() || isSearching}
          variant="outline"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {searchResults && searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {searchResults.map((user: User) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{user.firstName} {user.lastName}</p>
              </div>
              <Button
                size="sm"
                onClick={() => onUserSelect(user)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {searchResults && searchResults.length === 0 && searchTerm && !isSearching && (
        <p className="text-sm text-gray-500 text-center py-4">
          No users found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
};

export default UserSearchForm;
