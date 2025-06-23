
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
  const [isSearching, setIsSearching] = useState(false);

  const { data: searchResults, refetch } = useQuery({
    queryKey: ['userSearch', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const response = await fetch(`${API_BASE_URL}/users?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      return response.json();
    },
    enabled: false
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    await refetch();
    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                <p className="text-sm text-gray-500">{user.email}</p>
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

      {searchResults && searchResults.length === 0 && searchTerm && (
        <p className="text-sm text-gray-500 text-center py-4">
          No users found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
};

export default UserSearchForm;
