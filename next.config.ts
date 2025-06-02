/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Helps catch potential React bugs, recommended

  images: {
    domains: ['images.unsplash.com', 'i.pravatar.cc'],
     // Allow images from Unsplash
  },

  // You can add more config options here as needed
};

module.exports = nextConfig;
