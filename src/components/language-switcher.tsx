'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function useLanguageSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const switchLanguage = useCallback(
    (newLocale: string) => {
      const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
      router.push(newPath);
    },
    [router, pathname, locale]
  );

  return {
    locale,
    switchLanguage,
    isRTL: locale === 'ar',
  };
}

export default useLanguageSwitch;