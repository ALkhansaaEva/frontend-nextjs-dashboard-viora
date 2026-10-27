import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = (locale && locales.includes(locale as Locale)) ? locale : defaultLocale;
  
  return {
    locale: validLocale,
    messages: (await import(`./locales/${validLocale}/common.json`)).default,
  };
});