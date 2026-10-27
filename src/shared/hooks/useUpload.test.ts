// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUpload } from './useUpload';

const uploadFile = vi.hoisted(() => vi.fn());

vi.mock('@/services/media.service', () => ({
  mediaService: { uploadFile },
}));

import { UPLOAD_CONFIG } from '@/shared/config/upload';

const store = UPLOAD_CONFIG.store;

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('useUpload', () => {
  beforeEach(() => {
    uploadFile.mockReset();
    uploadFile.mockResolvedValue({
      id: 'media-1',
      // The backend rewrites `path` into a delivery URL on upload responses.
      path: 'https://evaka.store/media/store/abc.png',
    });
  });

  it('returns the backend delivery URL so the Asset URL field auto-fills', async () => {
    const { result } = renderHook(() => useUpload('store'));
    const url = await result.current.handleFile(makeFile('a.png', 'image/png'));
    expect(url).toBe('https://evaka.store/media/store/abc.png');
  });

  it('surfaces the backend reason instead of a generic "Upload failed"', async () => {
    // api-client rejects with a plain object, not an Error.
    uploadFile.mockRejectedValue({
      message: 'Unsupported file extension: .png',
      statusCode: 400,
      code: 'INVALID_INPUT',
    });
    const { result } = renderHook(() => useUpload('store'));
    const url = await result.current.handleFile(makeFile('a.png', 'image/png'));
    expect(url).toBeNull();
    await waitFor(() =>
      expect(result.current.error).toBe('Unsupported file extension: .png'),
    );
  });

  it('gates on the extension, not the browser-reported MIME', async () => {
    // Browsers report odd types for legitimate images; the backend gates on
    // extension + magic bytes, so this must reach the server.
    uploadFile.mockClear();
    const { result } = renderHook(() => useUpload('store'));
    await result.current.handleFile(makeFile('a.jpg', 'image/pjpeg'));
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('rejects an extension the backend would refuse, before any request', async () => {
    const { result } = renderHook(() => useUpload('store'));
    const url = await result.current.handleFile(makeFile('a.zip', 'application/zip'));
    expect(url).toBeNull();
    expect(uploadFile).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/Unsupported file type \.zip/));
  });

  it('rejects a file over the profile size limit', async () => {
    const { result } = renderHook(() => useUpload('store'));
    const url = await result.current.handleFile(makeFile('a.png', 'image/png', store.maxSize + 1));
    expect(url).toBeNull();
    expect(uploadFile).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toMatch(/too large/i));
  });
});