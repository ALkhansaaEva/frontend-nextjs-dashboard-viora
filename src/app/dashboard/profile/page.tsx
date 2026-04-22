'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Clock,
  Save,
  Loader2,
  Camera,
  Edit3
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { cn } from '@/shared/lib/utils';

interface ProfileFormData {
  nickname: string;
  email: string;
  title?: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account settings and profile</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-6",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "shadow-lg shadow-gray-200/10 dark:shadow-black/20"
        )}>
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-indigo-500/5" />
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {user?.nickname?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <button className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 p-2 rounded-xl bg-white dark:bg-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
        </div>

        {/* Form */}
        <div className={cn(
          "rounded-2xl p-6",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "shadow-lg shadow-gray-200/10 dark:shadow-black/20"
        )}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Account Information
          </h3>
          
          <div className="grid gap-6">
            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nickname
              </label>
              <div className="relative">
                <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  disabled={!isEditing}
                  className={cn(
                    "w-full h-12 ps-12 pe-4 rounded-xl border transition-colors",
                    "bg-gray-50 dark:bg-gray-900",
                    "border-gray-200 dark:border-gray-700",
                    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
                    isEditing ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400",
                    !isEditing && "cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={cn(
                    "w-full h-12 ps-12 pe-4 rounded-xl border transition-colors",
                    "bg-gray-50 dark:bg-gray-900",
                    "border-gray-200 dark:border-gray-700",
                    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
                    isEditing ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400",
                    !isEditing && "cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title (Optional)
              </label>
              <div className="relative">
                <Shield className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your title"
                  className={cn(
                    "w-full h-12 ps-12 pe-4 rounded-xl border transition-colors",
                    "bg-gray-50 dark:bg-gray-900",
                    "border-gray-200 dark:border-gray-700",
                    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
                    isEditing ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400",
                    !isEditing && "cursor-not-allowed",
                    !formData.title && "text-gray-400 dark:text-gray-500"
                  )}
                />
              </div>
            </div>

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
              <button
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
                className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className={cn(
          "rounded-2xl p-6",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "shadow-lg shadow-gray-200/10 dark:shadow-black/20"
        )}>
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
        </div>
      </div>
    </div>
  );
}