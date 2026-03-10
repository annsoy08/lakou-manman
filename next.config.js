/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  i18n,
};

module.exports = nextConfig;
