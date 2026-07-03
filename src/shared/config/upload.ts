export const UPLOAD_CONFIG = {
  avatar: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.avif',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'],
    maxSize: 5 * 1024 * 1024,
    bucket: 'avatars',
    fileKind: 'image' as const,
    filePurpose: 'icon' as const,
  },
  store: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.avif,.json',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'],
    maxSize: 10 * 1024 * 1024,
    bucket: 'store',
    fileKind: 'image' as const,
    filePurpose: 'full' as const,
  },
  gift: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg'],
    maxSize: 2 * 1024 * 1024,
    bucket: 'gifts',
    fileKind: 'image' as const,
    filePurpose: 'icon' as const,
  },
  achievement: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg'],
    maxSize: 2 * 1024 * 1024,
    bucket: 'achievements',
    fileKind: 'image' as const,
    filePurpose: 'icon' as const,
  },
  report: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.mp4,.webm,.pdf',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'video/mp4', 'video/webm', 'application/pdf'],
    maxSize: 15 * 1024 * 1024,
    bucket: 'reports',
    fileKind: 'image' as const,
    filePurpose: 'evidence' as const,
  },
  ticket: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.pdf,.zip',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'application/pdf', 'application/zip'],
    maxSize: 10 * 1024 * 1024,
    bucket: 'support',
    fileKind: 'image' as const,
    filePurpose: 'attachment' as const,
  },
  generic: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg'],
    maxSize: 5 * 1024 * 1024,
    bucket: 'uploads',
    fileKind: 'image' as const,
    filePurpose: 'generic' as const,
  },
} as const;

export type UploadProfile = keyof typeof UPLOAD_CONFIG;

export interface UploadOptions {
  profile: UploadProfile;
  onSuccess: (url: string) => void;
  onError?: (err: Error) => void;
  bucket?: string;
  fileKind?: string;
  filePurpose?: string;
}
