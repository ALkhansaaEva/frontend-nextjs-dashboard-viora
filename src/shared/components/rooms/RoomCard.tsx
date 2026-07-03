'use client';

import { Users, Hash, Signal, Eye } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';

interface Room {
  id: string;
  roomCode: string;
  name: Record<string, string>;
  level: number;
  updatedAt: string;
  memberCount?: number;
  isActive?: boolean;
}

interface RoomCardProps {
  room: Room;
  onView?: () => void;
}

export function RoomCard({ room, onView }: RoomCardProps) {
  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      <div className="h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-white rounded-full" />
        </div>
        <div className="absolute bottom-3 left-4 text-white">
          <p className="text-xs font-medium opacity-80">Level {room.level}</p>
          <div className="flex items-center gap-1 text-2xl font-bold">
            <Hash className="w-4 h-4 opacity-80" />
            {room.roomCode}
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate">{room.name?.en || room.name?.ar || 'Unnamed Room'}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {room.memberCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Signal className="w-3 h-3" />
            {room.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onView} className="w-full mt-2">
          <Eye className="w-3 h-3 mr-1" /> View Details
        </Button>
      </CardContent>
    </Card>
  );
}

export default RoomCard;
