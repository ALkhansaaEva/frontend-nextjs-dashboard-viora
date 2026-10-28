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
    // `.avif` is accepted by the backend `images` category, which validates the
    // `ftyp` box plus the `avif` brand (so an mp4/heic rename cannot pass).
    // Animated AVIF decodes natively in <img> where the browser supports it.
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.avif',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'],
    maxSize: 2 * 1024 * 1024,
    bucket: 'gifts',
    fileKind: 'image' as const,
    filePurpose: 'icon' as const,
  },
  achievement: {
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.avif',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'],
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
    accept: '.png,.gif,.webp,.svg,.jpg,.jpeg,.avif',
    acceptMime: ['image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/avif'],
    maxSize: 5 * 1024 * 1024,
    bucket: 'uploads',
    fileKind: 'image' as const,
    filePurpose: 'generic' as const,
  },
  /**
   * `animations` + `video` + animated images, mirroring the backend
   * `FILE_CATEGORIES` entries that gate `GiftCatalogItem.animationMediaId`:
   * images 10 MB, animations 20 MB, video 100 MB. `.lottie`/`.riv` arrive with a
   * generic or empty `File.type`, which is why the uploader validates by
   * extension + declared category instead of trusting `File.type`.
   */
  giftAnimation: {
    // `.svga` is a protobuf movie container validated by its `PKG` header. It
    // is NOT an image: the backend serves it as application/octet-stream, and
    // `MediaPreview` plays it with the lazily imported svgaplayerweb.
    accept: '.gif,.webp,.avif,.mp4,.webm,.lottie,.riv,.svga',
    acceptMime: [
      'image/gif',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'application/json',
      'application/zip',
      'application/octet-stream',
    ],
    maxSize: 20 * 1024 * 1024,
    bucket: 'gifts',
    fileKind: 'animated_webp' as const,
    filePurpose: 'animation' as const,
  },
  /** Dedicated SVGA animation upload: backend `animations` category (20 MB),
   * validated server-side by the `PKG` protobuf header — never by extension. */
  svga: {
    accept: '.svga',
    acceptMime: ['application/octet-stream'],
    maxSize: 20 * 1024 * 1024,
    bucket: 'uploads',
    fileKind: 'animation' as const,
    filePurpose: 'svga' as const,
  },
  /** Backend `audio` category: wav / ogg / m4a / mp3, 50 MB. */
  giftSound: {
    accept: '.wav,.ogg,.m4a,.mp3',
    acceptMime: ['audio/wav', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/x-wav'],
    maxSize: 50 * 1024 * 1024,
    bucket: 'gifts',
    fileKind: 'audio' as const,
    filePurpose: 'sound' as const,
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
