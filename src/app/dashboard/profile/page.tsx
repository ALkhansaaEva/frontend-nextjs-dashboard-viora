'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Shield,
  Clock,
  Save,
  Loader2,
  Camera,
  Edit3,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useAuthStore } from '@/store';
import { cn } from '@/shared/lib/utils';
import { mediaService } from '@/services/media.service';

interface ProfileFormData {
  nickname: string;
  email: string;
  title?: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    nickname: user?.nickname || '',
    email: user?.email || '',
    title: user?.title || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email || '',
        title: user.title || '',
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file type. Use PNG, GIF, WebP, SVG, JPEG, or AVIF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await mediaService.uploadOwnFile(file, 'avatars', {
        fileKind: file.type.includes('svg') ? 'svg' : 'image',
        filePurpose: 'icon',
      });
      setAvatarUrl(uploaded.path);
      if (user) {
        setUser({ ...user, avatar: uploaded.path });
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'suspended': return 'text-yellow-500 bg-yellow-500/10';
      case 'banned': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Profile"
        description="Manage your account settings and profile"
        variant="stack"
      />

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-indigo-500/5" />
          <CardContent className="relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar with upload */}
              <div className="relative group">
                <div className={cn(
                  "w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center overflow-hidden",
                  "bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600",
                  "shadow-lg shadow-indigo-600/20"
                )}>
                  {avatarUrl || user?.avatar ? (
                    <img
                      src={avatarUrl || user?.avatar || ''}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {user?.nickname?.[0]?.toUpperCase() || 'A'}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/gif,image/webp,image/svg+xml,image/jpeg,image/avif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 p-2 rounded-xl bg-white dark:bg-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-300 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.nickname || 'Admin'}
                  </h2>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium capitalize",
                    getStatusColor(user?.status)
                  )}>
                    {user?.status || 'active'}
                  </span>
                </div>
                {user?.title && (
                  <p className="text-gray-500 dark:text-gray-400 mb-3">{user.title}</p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {user?.email || 'admin@viora.com'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Joined {formatDate(user?.createdAt)}
                  </span>
                </div>
              </div>

              {/* Edit Button */}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Account Information
            </h3>

            <div className="grid gap-6">
              <Input
                label="Nickname"
                icon={<User className="w-5 h-5" />}
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                disabled={!isEditing}
              />

              <Input
                label="Email"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />

              <Input
                label="Title (Optional)"
                icon={<Shield className="w-5 h-5" />}
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your title"
              />

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {user?.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <span
                        key={role.code}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium"
                      >
                        <Shield className="w-4 h-4" />
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Wallet */}
              {user?.wallet && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wallet Balance
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className={cn(
                      "flex items-center gap-3 p-4 rounded-xl",
                      "bg-amber-50 dark:bg-amber-900/20",
                      "border border-amber-200 dark:border-amber-800"
                    )}>
                      <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                        <span className="text-white font-bold">G</span>
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Gold</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                          {user.wallet.gold.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-3 p-4 rounded-xl",
                      "bg-purple-50 dark:bg-purple-900/20",
                      "border border-purple-200 dark:border-purple-800"
                    )}>
                      <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold">D</span>
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Gems</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {user.wallet.gems.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (user) {
                      setFormData({
                        nickname: user.nickname || '',
                        email: user.email || '',
                        title: user.title || '',
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  isLoading={isSaving}
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Security
            </h3>

            <div className="space-y-4">
              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your password</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
