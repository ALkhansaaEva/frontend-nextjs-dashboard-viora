'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Plus, Pencil, Trash2, Coins, Gem } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { giftsService, type GiftCatalogEntry, type CreateGiftRequest, type UpdateGiftRequest } from '@/services/gifts.service';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';

export default function GiftsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canManage = hasPermission('manage_store');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GiftCatalogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    titleI18n: '{}',
    descriptionI18n: '{}',
    icon: '',
    priceGems: 0,
    priceCoins: 0,
    isActive: true,
    stock: 0,
  });

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['gifts-catalog'],
    queryFn: () => giftsService.getCatalog(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGiftRequest) => giftsService.createCatalogEntry(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGiftRequest }) => giftsService.updateCatalogEntry(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => giftsService.deleteCatalogEntry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); setDeleteTarget(null); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', titleI18n: '{}', descriptionI18n: '{}', icon: '', priceGems: 0, priceCoins: 0, isActive: true, stock: 0 });
    setShowModal(true);
  };

  const openEdit = (entry: GiftCatalogEntry) => {
    setEditing(entry);
    setForm({
      code: entry.code,
      titleI18n: JSON.stringify(entry.titleI18n),
      descriptionI18n: JSON.stringify(entry.descriptionI18n || {}),
      icon: entry.icon,
      priceGems: entry.priceGems,
      priceCoins: entry.priceCoins,
      isActive: entry.isActive,
      stock: entry.stock,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = () => {
    let titleI18n: Record<string, string> = {};
    let descriptionI18n: Record<string, string> = {};
    try { titleI18n = JSON.parse(form.titleI18n); } catch { titleI18n = { en: form.titleI18n }; }
    try { descriptionI18n = JSON.parse(form.descriptionI18n); } catch { descriptionI18n = { en: form.descriptionI18n }; }

    const payload = {
      code: form.code,
      titleI18n,
      descriptionI18n: Object.keys(descriptionI18n).length > 0 ? descriptionI18n : undefined,
      icon: form.icon || undefined,
      priceGems: form.priceGems || undefined,
      priceCoins: form.priceCoins || undefined,
      isActive: form.isActive,
      stock: form.stock || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload as UpdateGiftRequest });
    } else {
      createMutation.mutate(payload as CreateGiftRequest);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-pink-500" />
          {t('giftsCatalog') || 'Gifts Catalog'}
        </h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> {t('create') || 'Create'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">{t('code')}</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">{t('title')}</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    <span className="flex items-center justify-end gap-1"><Coins className="w-3 h-3" /> Gold</span>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    <span className="flex items-center justify-end gap-1"><Gem className="w-3 h-3" /> Gems</span>
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">{t('stock') || 'Stock'}</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-500">{t('status')}</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 font-mono text-sm text-gray-900 dark:text-white">{entry.code}</td>
                    <td className="p-4 text-sm text-gray-900 dark:text-white">{entry.titleI18n?.en || entry.code}</td>
                    <td className="p-4 text-sm text-right text-gray-900 dark:text-white">{entry.priceCoins || 0}</td>
                    <td className="p-4 text-sm text-right text-gray-900 dark:text-white">{entry.priceGems || 0}</td>
                    <td className="p-4 text-sm text-right text-gray-900 dark:text-white">{entry.stock ?? '∞'}</td>
                    <td className="p-4 text-center">
                      <Badge variant={entry.isActive ? 'success' : 'danger'}>
                        {entry.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(entry.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {catalog.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={showModal} onClose={closeModal} title={editing ? (t('edit') || 'Edit Gift') : (t('create') || 'Create Gift')}>
        <div className="space-y-4">
          <Input label={t('code')} placeholder="gift_code" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
          <Input label={t('titleI18n') || 'Title (JSON)'} placeholder='{"en":"Gift","ar":"هدية"}'
            value={form.titleI18n} onChange={(e) => setForm({ ...form, titleI18n: e.target.value })} />
          <Input label={t('descriptionI18n') || 'Description (JSON)'} placeholder='{"en":"Desc"}'
            value={form.descriptionI18n} onChange={(e) => setForm({ ...form, descriptionI18n: e.target.value })} />
          <Input label={t('icon') || 'Icon'} placeholder="icon_path" value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('priceCoins') || 'Price (Gold)'} type="number" value={form.priceCoins}
              onChange={(e) => setForm({ ...form, priceCoins: parseInt(e.target.value) || 0 })} />
            <Input label={t('priceGems') || 'Price (Gems)'} type="number" value={form.priceGems}
              onChange={(e) => setForm({ ...form, priceGems: parseInt(e.target.value) || 0 })} />
          </div>
          <Input label={t('stock') || 'Stock (0 = unlimited)'} type="number" value={form.stock}
            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            {t('active')}
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeModal}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.code}>{t('save') || 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Gift'}
        message={t('deleteConfirm') || 'Are you sure?'}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
      />
    </div>
  );
}
