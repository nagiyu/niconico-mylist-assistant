import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Niconico Mylist Assistant',
    short_name: 'NMA',
    description: 'A browser extension to enhance your Niconico Mylist experience',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/ponzu_square.png',
        sizes: '400x400',
        type: 'image/png'
      }
    ],
  }
}