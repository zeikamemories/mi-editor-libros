import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zeika',
  description: 'Zeika Memories & Editorial',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/ddt8web.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Meow+Script&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}