import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PlacementCardProps {
  placement: {
    id: number;
    userId: number;
    user: {
      profile?: {
        Forename?: string;
        Surname?: string;
      };
      username?: string;
    };
    status: string;
    confirmed: boolean;
  };
  day: Date;
}

const PlacementCard: React.FC<PlacementCardProps> = ({ placement, day }) => {
  const getCandidateName = () => {
    const profile = placement.user?.profile;
    if (profile?.Forename && profile?.Surname) {
      return `${profile.Forename} ${profile.Surname}`;
    }
    return placement.user?.username || `User ${placement.userId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'awaiting_confirmation': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'absent_explained': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'absent_unexplained': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {getCandidateName()}
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ${getStatusColor(placement.status)}`}
        >
          {placement.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  );
};

export default PlacementCard;