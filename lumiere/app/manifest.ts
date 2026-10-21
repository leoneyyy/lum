import type { MetadataRoute } from 'next';

// Lets the app be added to the home screen and open standalone, without
// browser chrome. No service worker: installability doesn't need one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumière',
    short_name: 'Lumière',
    description: 'A field guide to what you watched.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#06040a',
    theme_color: '#06040a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
