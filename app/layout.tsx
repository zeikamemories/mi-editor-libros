import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { LanguageProvider } from './context/LanguageContext'

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
      <body suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
        <Script id="scroll-back-product" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              if (sessionStorage.getItem('zeika_back_product')) {
                var el = document.getElementById('productos');
                if (el) window.scrollTo({ top: el.offsetTop - 88, behavior: 'instant' });
              }
            } catch(e) {}
          })();
        `}} />
      </body>
    </html>
  )
}