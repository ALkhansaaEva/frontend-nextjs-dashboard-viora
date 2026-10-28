'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Download,
  Eye,
  RefreshCw,
  Replace,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  mediaService,
  type MediaFile,
  type UploadProgress,
} from '@/services/media.service';
import { UPLOAD_CONFIG } from '@/shared/config/upload';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Loader } from '@/shared/components/ui/Loader';
import { MediaPreview, MediaPreviewThumb } from '@/shared/components/media/MediaPreview';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import { formatBytes } from '@/shared/lib/utils';

const PAGE_LIMIT = 12;

// The svga profile declares what the backend animations category accepts
// (.svga container, 20 MB ceiling); the backend revalidates everything.
const SVGA_PROFILE = UPLOAD_CONFIG.svga;

function checksumLabel(file: MediaFile): string | null {
  const checksum = file.meta?.checksumSha256;
  return typeof checksum === 'string' && checksum ? checksum : null;
}

/** Upload errors arrive as plain {message, statusCode} objects, not Error. */
function errorText(err: unknown, fallback: string): string {
  const msg = (err as { message?: string })?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
}

export default function MediaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const hasPermission = useHasPermission();

  const canRead = hasPermission('media.read');
  const canWrite = hasPermission('media.write');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Upload / drag-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Replace state
  const [replaceTarget, setReplaceTarget] = useState<MediaFile | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);

  const [previewTarget, setPreviewTarget] = useState<MediaFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    // isLoading starts true; .then/.finally below own every transition.
    // A synchronous setIsLoading(true) here is flagged by the react-hooks
    // lint rule (cascading renders) and only re-shows the skeleton.
    mediaService
      .getAdminFiles({ page, limit: PAGE_LIMIT, search: search || undefined })
      .then((result) => {
        if (cancelled) return;
        setFiles(result.data);
        setPagination({ total: result.total, totalPages: result.totalPages });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, page, search, refreshKey]);

  // DataTable reports every keystroke; debounce so the list is not refetched per character.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        const url = new URL(window.location.href);
        if (query) url.searchParams.set('search', query);
        else url.searchParams.delete('search');
        url.searchParams.set('page', '1');
        router.push(`${url.pathname}?${url.searchParams.toString()}`);
      }, 300);
    },
    [router],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const url = new URL(window.location.href);
      url.searchParams.set('page', newPage.toString());
      router.push(`${url.pathname}?${url.searchParams.toString()}`);
    },
    [router],
  );

  const uploadProgressPct = (progress: UploadProgress): number =>
    progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;

  const acceptSvgaFile = useCallback((file: File): string | null => {
    if (!file.name.toLowerCase().endsWith(SVGA_PROFILE.accept)) {
      return 'Only .svga files are accepted here.';
    }
    if (file.size > SVGA_PROFILE.maxSize) {
      return `File exceeds the ${formatBytes(SVGA_PROFILE.maxSize)} limit.`;
    }
    return null;
  }, []);

  const startUpload = useCallback(
    (file: File) => {
      const invalid = acceptSvgaFile(file);
      if (invalid) {
        setUploadError(invalid);
        return;
      }
      setUploadError(null);
      setUploadProgress(0);
      mediaService
        .uploadFile(file, SVGA_PROFILE.bucket, {
          fileKind: SVGA_PROFILE.fileKind,
          filePurpose: SVGA_PROFILE.filePurpose,
          onUploadProgress: (progress) => setUploadProgress(uploadProgressPct(progress)),
        })
        .then(() => {
          toast.success('Animation uploaded', file.name);
          refresh();
        })
        .catch((err) => {
          toast.error('Upload failed', errorText(err, file.name));
          setUploadError(errorText(err, 'Upload failed.'));
        })
        .finally(() => setUploadProgress(null));
    },
    [acceptSvgaFile, refresh, toast],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (!canWrite) return;
      const file = event.dataTransfer.files?.[0];
      if (file) startUpload(file);
    },
    [canWrite, startUpload],
  );

  const handleDownload = useCallback(
    (file: MediaFile) => {
      mediaService
        .fetchContentBlob(file.id)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = file.originalName || `${file.id}.svga`;
          anchor.click();
          URL.revokeObjectURL(url);
        })
        .catch((err) => toast.error('Download failed', errorText(err, file.id)));
    },
    [toast],
  );

  const handleIntegrity = useCallback(
    (file: MediaFile) => {
      mediaService
        .verifyIntegrity(file.id)
        .then((report) => {
          if (report.match === true) {
            toast.success('Checksum verified', `${file.originalName || file.id} matches its recorded sha256.`);
          } else if (report.match === false) {
            toast.error('Checksum mismatch', `${file.originalName || file.id} differs from its recorded sha256.`);
          } else {
            toast.success('No checksum recorded', 'This asset was uploaded before checksums; replace it to record one.');
          }
        })
        .catch((err) => toast.error('Integrity check failed', errorText(err, file.id)));
    },
    [toast],
  );

  const handleReplace = useCallback(() => {
    if (!replaceTarget || !replaceFile) return;
    const invalid = acceptSvgaFile(replaceFile);
    if (invalid) {
      toast.error('Invalid replacement file', invalid);
      return;
    }
    setReplaceProgress(0);
    mediaService
      .replaceAdminFile(replaceTarget.id, replaceFile, {
        onUploadProgress: (progress) => setReplaceProgress(uploadProgressPct(progress)),
      })
      .then(() => {
        toast.success('Asset replaced', replaceTarget.originalName || replaceTarget.id);
        setReplaceTarget(null);
        setReplaceFile(null);
        refresh();
      })
      .catch((err) => toast.error('Replace failed', errorText(err, replaceTarget.id)))
      .finally(() => setReplaceProgress(null));
  }, [acceptSvgaFile, refresh, replaceFile, replaceTarget, toast]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    mediaService
      .deleteAdminFile(deleteTarget.id)
      .then(() => {
        toast.success('Asset deleted', deleteTarget.originalName || deleteTarget.id);
        setDeleteTarget(null);
        refresh();
      })
      .catch((err) => toast.error('Delete failed', errorText(err, deleteTarget.id)));
  }, [deleteTarget, refresh, toast]);

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-2">You do not have permission to view media.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This page needs the <code className="font-mono">media.read</code> permission.
        </p>
      </div>
    );
  }

  const columns: Column<MediaFile>[] = [
    {
      key: 'preview',
      header: 'Preview',
      className: 'w-24',
      render: (file) => (
        <div className="w-16 h-16 overflow-hidden rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <MediaPreviewThumb media={file} alt={file.originalName || 'media'} />
        </div>
      ),
    },
    {
      key: 'name',
      header: 'File',
      render: (file) => (
        <div className="min-w-0">
          <p
            className="font-medium text-gray-900 dark:text-white truncate max-w-[16rem]"
            title={file.originalName || file.path}
          >
            {file.originalName || file.path}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[16rem]" title={file.id}>
            {file.id}
          </p>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Kind',
      render: (file) => (
        <div className="flex flex-col gap-1">
          <Badge variant="default">{file.fileKind || file.mimeType}</Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">{file.bucket}</span>
        </div>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      render: (file) => formatBytes(Number(file.sizeBytes)),
    },
    {
      key: 'checksum',
      header: 'Checksum (sha256)',
      render: (file) => {
        const checksum = checksumLabel(file);
        return checksum ? (
          <span
            className="font-mono text-xs text-gray-600 dark:text-gray-300"
            title={checksum}
          >
            {checksum.slice(0, 10)}…
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500" title="Uploaded before checksums were recorded">
            none
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      render: (file) => new Date(file.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-52',
      render: (file) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPreviewTarget(file)} title="Preview">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title="Download original">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleIntegrity(file)} title="Verify checksum">
            <RefreshCw className="w-4 h-4" />
          </Button>
          {canWrite && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setReplaceTarget(file)} title="Replace file">
                <Replace className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(file)} title="Delete">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Media Library" description="Upload and manage animation assets (.svga) served to the mobile app." />

      {canWrite && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={SVGA_PROFILE.accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) startUpload(file);
              event.target.value = '';
            }}
          />
          {uploadProgress !== null ? (
            <div className="w-full max-w-sm space-y-2">
              <Loader size="sm" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Uploading… {uploadProgress}%</p>
              <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Drag & drop an <span className="font-semibold">.svga</span> file here, or click to browse
              </p>
              <p className="text-xs text-gray-400">Up to {formatBytes(SVGA_PROFILE.maxSize)} · validated server-side</p>
            </>
          )}
          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Could not load media files.</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      ) : (
        <DataTable
          data={files}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Search by file name…"
          onSearch={handleSearch}
          pagination={{
            page,
            limit: PAGE_LIMIT,
            total: pagination.total,
            totalPages: pagination.totalPages,
            onPageChange: handlePageChange,
          }}
          emptyMessage="No media files uploaded yet."
        />
      )}

      {/* Preview */}
      <Modal isOpen={previewTarget !== null} onClose={() => setPreviewTarget(null)} title={previewTarget?.originalName || 'Preview'} size="lg">
        {previewTarget && (
          <div className="space-y-3">
            <div className="rounded bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-center min-h-[240px]">
              <MediaPreview media={previewTarget} alt={previewTarget.originalName || 'media'} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
              {previewTarget.bucket}/{previewTarget.path} · {formatBytes(Number(previewTarget.sizeBytes))} ·{' '}
              {checksumLabel(previewTarget) ? `sha256 ${checksumLabel(previewTarget)}` : 'no checksum recorded'}
            </p>
          </div>
        )}
      </Modal>

      {/* Replace */}
      <Modal
        isOpen={replaceTarget !== null}
        onClose={() => {
          setReplaceTarget(null);
          setReplaceFile(null);
        }}
        title={`Replace ${replaceTarget?.originalName || 'asset'}`}
        size="md"
      >
        {replaceTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The media id stays the same; the stored bytes are replaced and the checksum re-recorded.
            </p>
            <input
              type="file"
              accept={SVGA_PROFILE.accept}
              onChange={(event) => setReplaceFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 dark:text-gray-300
                file:mr-3 file:rounded file:border-0 file:bg-gray-100 dark:file:bg-gray-800
                file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            {replaceProgress !== null && <Loader size="sm" />}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setReplaceTarget(null);
                  setReplaceFile(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleReplace} disabled={!replaceFile || replaceProgress !== null}>
                Replace
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete media file"
        message={`Delete "${deleteTarget?.originalName || deleteTarget?.id}"? The stored file is removed permanently; the mobile app will no longer be able to fetch it.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
