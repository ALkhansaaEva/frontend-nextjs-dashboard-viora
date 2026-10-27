import { describe, expect, it } from 'vitest';
import { ticketFrameIsUpdate } from './ticket-stream';

describe('ticketFrameIsUpdate', () => {
  it('accepts a ticket frame in the Nest SSE wire format', () => {
    expect(
      ticketFrameIsUpdate(
        'id: 2\ndata: {"type":"ticket","data":{"ticketId":"t1"}}',
      ),
    ).toBe(true);
  });

  it('ignores the keepalive ping', () => {
    expect(ticketFrameIsUpdate('id: 1\ndata: {"type":"ping","data":{}}')).toBe(
      false,
    );
  });

  it('treats an unparseable data frame as an update', () => {
    expect(ticketFrameIsUpdate('data: changed')).toBe(true);
  });

  it('ignores comment-only frames', () => {
    expect(ticketFrameIsUpdate(': keepalive')).toBe(false);
  });
});
