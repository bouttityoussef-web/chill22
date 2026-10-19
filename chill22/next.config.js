/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/watch4kservice',
        destination: '/',
        permanent: true,
      },
      {
        source: '/watch4kserer8',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
