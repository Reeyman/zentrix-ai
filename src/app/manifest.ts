import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zentrix AI',
    short_name: 'Zentrix',
    description: 'Enterprise advertising workspace with AI-guided operations, analytics, and governance.',
    start_url: '/app/overview',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050914',
    theme_color: '#0a0e1a',
    categories: ['business', 'productivity', 'analytics'],
    icons: [
      {
        src: '/icon.svg?v=3',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg?v=3',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
