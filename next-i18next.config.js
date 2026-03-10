module.exports = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'ht'],
  },
  fallbackLng: 'fr',
  debug: process.env.NODE_ENV === 'development',
  serializeConfig: false,
  use: [
    require('i18next-fs-backend'),
  ],
  ns: ['common', 'navigation', 'boutique', 'home'],
  defaultNS: 'common',
  backend: {
    loadPath: './locales/{{lng}}/{{ns}}.json',
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
