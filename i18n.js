const { i18n } = require('next-i18next');

const backend = {
  loadPath: '/locales/{{lng}}/{{ns}}.json',
};

const serializer = {
  key: '{{key}}',
  value: '{{value}}',
};

module.exports = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'ht'],
  },
  backend,
  serialize: serializer,
  debug: process.env.NODE_ENV === 'development',
};
