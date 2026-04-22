'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

interface MessageProviderProps {
  children: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any;
  locale: string;
}

export function MessageProvider({ children, messages, locale }: MessageProviderProps) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

export default MessageProvider;