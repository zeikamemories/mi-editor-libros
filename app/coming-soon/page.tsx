import Image from 'next/image'

export default function ComingSoonPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F0EFEB',
      fontFamily: 'var(--font-body, sans-serif)',
      gap: '24px',
      padding: '40px',
      textAlign: 'center',
    }}>
      <Image src="/LogoZeika.png" alt="Zeika" width={64} height={64} />
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#191919', margin: 0 }}>
        Próximamente
      </h1>
      <p style={{ fontSize: '15px', color: '#555', margin: 0, maxWidth: '320px' }}>
        Estamos preparando algo especial. Si recibiste un link de acceso, usalo para entrar.
      </p>
    </div>
  )
}
