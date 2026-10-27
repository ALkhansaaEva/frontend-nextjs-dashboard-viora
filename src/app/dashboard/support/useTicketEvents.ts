'use client';

import { useEffect, useRef, useState } from 'react';
import { ticketFrameIsUpdate } from './ticket-stream';

export type TicketStreamStatus = 'connecting' | 'live' | 'offline';

const RETRY_CEILING_MS = 15000;

/**
 * Subscribes to the ticket SSE route through the same-origin proxy. The stream
 * only says "the ticket changed"; the caller refetches the real data.
 */
export function useTicketEvents(
  ticketId: string | null,
  onEvent: () => void,
): TicketStreamStatus {
  const [status, setStatus] = useState<TicketStreamStatus>('connecting');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!ticketId) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = async () => {
      setStatus(attempt === 0 ? 'connecting' : 'offline');
      try {
        const response = await fetch(
          `/api/proxy/support/tickets/${ticketId}/events`,
          {
            headers: { accept: 'text/event-stream' },
            signal: controller.signal,
            cache: 'no-store',
          },
        );
        if (!response.ok || !response.body) {
          throw new Error(`ticket stream ${response.status}`);
        }
        setStatus('live');
        attempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (ticketFrameIsUpdate(frame)) onEventRef.current();
            boundary = buffer.indexOf('\n\n');
          }
        }
        throw new Error('ticket stream closed');
      } catch {
        if (controller.signal.aborted) return;
        setStatus('offline');
        attempt += 1;
        retry = setTimeout(
          connect,
          Math.min(1000 * 2 ** attempt, RETRY_CEILING_MS),
        );
      }
    };

    void connect();
    return () => {
      controller.abort();
      if (retry) clearTimeout(retry);
    };
  }, [ticketId]);

  return status;
}
