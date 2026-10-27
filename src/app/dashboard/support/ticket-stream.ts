/** A Nest `@Sse` frame is an update unless it is the keepalive ping. */
export function ticketFrameIsUpdate(frame: string): boolean {
  const lines = frame.split('\n');
  const payload = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n');
  if (!payload) return false;
  try {
    return (JSON.parse(payload) as { type?: string }).type !== 'ping';
  } catch {
    return true;
  }
}
