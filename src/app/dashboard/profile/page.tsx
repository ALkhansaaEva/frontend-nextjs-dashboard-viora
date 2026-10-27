'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  User, Mail, Shield, Clock, Save, Loader2, Camera, Edit3, Fingerprint, Globe2,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useToast } from '@/store/toast.store';
import { cn } from '@/shared/lib/utils';
import { mediaService } from '@/services/media.service';
import { userProfileService, type MeSnapshot, type UpdateProfileInput } from '@/services/user-profile.service';

const AVATAR_TYPES = ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

type EditableForm = Required<Omit<UpdateProfileInput, 'avatarUrl'>>;

/**
 * Self-service profile. GET /users/me carries no wallet, so no balance is shown
 * here — /users/me/bootstrap does, and is not this page's contract.
 * Every write goes through a real route:
 * PATCH /users/me/profile (UpdateProfileDto), PATCH /users/me/avatar and
 * PATCH /users/me/email-otp. There is no change-password endpoint, so no such
 * control is offered. Email is read-only — no backend route changes it.
 */
export default function ProfilePage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snapshot, setSnapshot] = useState<MeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState<EditableForm>({
    username: '', nickname: '', globalNickname: '', title: '', countryCode: '', gender: 'other', bio: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [otpEnabled, setOtpEnabled] = useState<boolean | null>(null);
  const [otpPending, setOtpPending] = useState(false);

  const applySnapshot = useCallback((data: MeSnapshot) => {
    setSnapshot(data);
    setAvatarUrl(data.profile?.avatarUrl ?? null);
    setForm({
      username: data.profile?.username ?? '',
      nickname: data.user.nickname ?? '',
      globalNickname: data.user.globalNickname ?? '',
      title: data.user.title ?? '',
      countryCode: data.profile?.countryCode ?? '',
      gender: data.profile?.gender ?? 'other',
      bio: data.profile?.bio ?? '',
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      applySnapshot(await userProfileService.getMe());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userProfileService.updateProfile({
        username: form.username.trim(),
        nickname: form.nickname.trim(),
        globalNickname: form.globalNickname.trim(),
        title: form.title.trim(),
        countryCode: form.countryCode.trim().slice(0, 2).toUpperCase(),
        gender: form.gender,
        bio: form.bio.trim(),
      });
      setIsEditing(false);
      toast.success('Profile saved.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use PNG, GIF, WebP, SVG, JPEG or AVIF.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('File too large. Maximum 5 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await mediaService.uploadOwnFile(file, 'avatars', {
        fileKind: file.type.includes('svg') ? 'svg' : 'image',
        filePurpose: 'icon',
      });
      // Persist immediately: the upload only stores an asset, the profile only
      // points at it once PATCH /users/me/avatar succeeds.
      await userProfileService.updateAvatar(uploaded.path);
      setAvatarUrl(uploaded.path);
      toast.success('Avatar updated.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleOtp = async () => {
    const next = !(otpEnabled ?? false);
    setOtpPending(true);
    try {
      const result = await userProfileService.setEmailOtpEnabled(next);
      setOtpEnabled(typeof result.emailOtpEnabled === 'boolean' ? result.emailOtpEnabled : next);
      toast.success(next ? 'Email OTP enabled.' : 'Email OTP disabled.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email OTP.');
    } finally {
      setOtpPending(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (snapshot) applySnapshot(snapshot);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime())
      ? 'N/A'
      : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'suspended': return 'text-yellow-500 bg-yellow-500/10';
      case 'banned': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError || !snapshot) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
          {loadError ?? 'Failed to load your profile.'}
        </div>
        <Button className="mt-4" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const roles = snapshot.user.roles ?? [];
  const bioLength = form.bio.length;
  const overUsernameLimit = form.username.trim().length > 50;
  const overBioLimit = bioLength > 500;
  const overCountryLimit = form.countryCode.trim().length > 2;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Profile"
        description="Manage your account settings and profile"
        variant="stack"
      />

      <div className="space-y-6">
        {/* Identity header */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-indigo-500/5" />
          <CardContent className="relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative">
                <div className={cn(
                  'w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center overflow-hidden',
                  'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600',
                  'shadow-lg shadow-indigo-600/20',
                )}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {(snapshot.user.nickname || snapshot.profile?.username || 'A')[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_TYPES.join(',')}
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Change avatar"
                  className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 p-2 rounded-xl bg-white dark:bg-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-300 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {snapshot.user.nickname || snapshot.profile?.username || 'Unnamed'}
                  </h2>
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium capitalize', getStatusColor(snapshot.user.status))}>
                    {snapshot.user.status}
                  </span>
                </div>
                {snapshot.user.title && (
                  <p className="text-gray-500 dark:text-gray-400 mb-3">{snapshot.user.title}</p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {snapshot.user.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Joined {formatDate(snapshot.user.createdAt)}
                  </span>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
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

        {/* Editable fields — exactly the UpdateProfileDto surface */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Profile details</h3>
            <p className="text-sm text-gray-500 mb-6">
              Saved with <code>PATCH /users/me/profile</code>. The username is change-limited to once per 30 days.
            </p>

            <div className="grid gap-6">
              <Input
                label="Username"
                icon={<User className="w-5 h-5" />}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!isEditing}
                error={overUsernameLimit ? 'Maximum 50 characters.' : undefined}
              />

              <Input
                label="Nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                disabled={!isEditing}
              />

              <Input
                label="Global nickname"
                value={form.globalNickname}
                onChange={(e) => setForm({ ...form, globalNickname: e.target.value })}
                disabled={!isEditing}
              />

              <Input
                label="Title"
                icon={<Shield className="w-5 h-5" />}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!isEditing}
                placeholder="Optional"
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <Input
                  label="Country code"
                  icon={<Globe2 className="w-5 h-5" />}
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase().slice(0, 2) })}
                  disabled={!isEditing}
                  maxLength={2}
                  placeholder="SA"
                  error={overCountryLimit ? 'Exactly 2 letters.' : undefined}
                />
                <Select
                  label="Gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as EditableForm['gender'] })}
                  disabled={!isEditing}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  disabled={!isEditing}
                  aria-describedby="profile-bio-count"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <p id="profile-bio-count" className={cn('mt-1 text-xs', overBioLimit ? 'text-red-500' : 'text-gray-400')}>
                  {bioLength} / 500
                </p>
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>Cancel</Button>
                  <Button
                    onClick={() => void handleSave()}
                    isLoading={isSaving}
                    disabled={overUsernameLimit || overBioLimit || overCountryLimit}
                  >
                    {!isSaving && <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Identity & contact — server-owned, read-only */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Identity &amp; contact</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Fingerprint className="w-4 h-4 inline mr-1" />Immutable user ID
                </label>
                <p className="font-mono text-sm break-all text-gray-900 dark:text-white">
                  {snapshot.user.immutableUserId || '—'}
                </p>
                <p className="text-xs text-gray-400">Permanent public identifier. No route changes it.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal UUID</label>
                <p className="font-mono text-sm break-all text-gray-900 dark:text-white">{snapshot.user.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <Input type="email" value={snapshot.user.email} disabled readOnly />
                <p className="text-xs text-gray-400">Managed by the auth provider — no profile route changes it.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {snapshot.profile?.level ?? '—'} · {snapshot.profile?.xp ?? 0} XP
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.length > 0 ? roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      {role}
                    </span>
                  )) : (
                    <span className="text-gray-500 dark:text-gray-400">No roles assigned</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Security</h3>
            <p className="text-sm text-gray-500 mb-6">
              Managed with <code>PATCH /users/me/email-otp</code>. No password-change endpoint exists on this API.
            </p>

            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="text-start">
                  <p className="font-medium text-gray-900 dark:text-white">Email OTP verification</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {otpEnabled === null
                      ? 'Current state is not returned by any read route — set it here and the response confirms.'
                      : otpEnabled ? 'Enabled — logins require a one-time code by email.' : 'Disabled.'}
                  </p>
                </div>
              </div>
              <Button
                variant={otpEnabled ? 'outline' : 'primary'}
                onClick={() => void toggleOtp()}
                disabled={otpPending}
                isLoading={otpPending}
              >
                {otpEnabled === null ? 'Enable' : otpEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
