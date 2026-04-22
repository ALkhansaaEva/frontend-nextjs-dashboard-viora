'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Crown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { ranksService } from '@/services';

interface SystemRank {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  badgeItemId?: string;
  priority: number;
}

export default function RanksPage() {
  const [ranks, setRanks] = useState<SystemRank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<SystemRank | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRank, setNewRank] = useState({
    code: '',
    titleEn: '',
    titleAr: '',
    descriptionEn: '',
    descriptionAr: '',
    priority: 0,
  });
  const fetchingRef = useRef(false);

  useEffect(() => {
    fetchRanks();
  }, []);

  useEffect(() => {
    if (error && error.includes('403')) {
      setError('You do not have permission to view ranks. Admin role required.');
    } else if (error && error.includes('401')) {
      setError('Authentication required. Please login again.');
    }
  }, [error]);

  const fetchRanks = async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ranksService.getSystemRanks();
      setRanks(data || []);
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      if (error.statusCode === 409 || error.message?.includes('Duplicate')) {
        console.warn('Duplicate request, skipping fetch');
        return;
      }
      console.error('Failed to fetch ranks:', err);
      setError(error.message || 'Failed to load ranks');
      setRanks([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleCreateRank = async () => {
    try {
      await ranksService.createSystemRank({
        code: newRank.code,
        titleI18n: { en: newRank.titleEn, ar: newRank.titleAr },
        descriptionI18n: { en: newRank.descriptionEn, ar: newRank.descriptionAr },
        priority: newRank.priority,
      });
      setShowCreateModal(false);
      setNewRank({
        code: '',
        titleEn: '',
        titleAr: '',
        descriptionEn: '',
        descriptionAr: '',
        priority: 0,
      });
      await fetchRanks();
    } catch (err) {
      console.error('Failed to create rank:', err);
      setError('Failed to create rank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Ranks</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rank
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ranks.map((rank) => (
          <div
            key={rank.id}
            className="cursor-pointer"
            onClick={() => setSelectedRank(rank)}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    {rank.titleI18n?.en || rank.code}
                  </CardTitle>
                  <Badge variant="outline">Priority: {rank.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent>
<p className="text-sm text-gray-500 dark:text-gray-400">
                {rank.descriptionI18n?.en || 'No description'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Code: {rank.code}</p>
            </CardContent>
            </Card>
          </div>
        ))}
        {ranks.length === 0 && !error && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No ranks found
          </div>
        )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create System Rank">
        <div className="space-y-4">
          <Input
            label="Rank Code"
            placeholder="e.g., vip, moderator"
            value={newRank.code}
            onChange={(e) => setNewRank({ ...newRank, code: e.target.value })}
          />
          <Input
            label="Title (English)"
            placeholder="VIP User"
            value={newRank.titleEn}
            onChange={(e) => setNewRank({ ...newRank, titleEn: e.target.value })}
          />
          <Input
            label="Title (Arabic)"
            placeholder="مستخدم VIP"
            value={newRank.titleAr}
            onChange={(e) => setNewRank({ ...newRank, titleAr: e.target.value })}
          />
          <Input
            label="Description (English)"
            placeholder="VIP description"
            value={newRank.descriptionEn}
            onChange={(e) => setNewRank({ ...newRank, descriptionEn: e.target.value })}
          />
          <Input
            label="Description (Arabic)"
            placeholder="وصف VIP"
            value={newRank.descriptionAr}
            onChange={(e) => setNewRank({ ...newRank, descriptionAr: e.target.value })}
          />
          <Input
            label="Priority"
            type="number"
            placeholder="0"
            value={newRank.priority}
            onChange={(e) => setNewRank({ ...newRank, priority: parseInt(e.target.value) || 0 })}
          />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreateRank}>Create</Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!selectedRank} onClose={() => setSelectedRank(null)} title="Rank Details">
        {selectedRank && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Code</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Title (EN)</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.titleI18n?.en}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Title (AR)</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.titleI18n?.ar}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.priority}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.descriptionI18n?.en}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedRank(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}