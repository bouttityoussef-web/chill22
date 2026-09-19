/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/watch4kservice',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
