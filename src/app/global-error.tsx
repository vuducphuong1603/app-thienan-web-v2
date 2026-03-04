'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void _error // consumed for type compliance
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #FFF5F0 0%, #FFF0EB 50%, #FFE8E0 100%)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: '#FFF0EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FA865E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Hệ thống gặp sự cố
            </h2>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>
              Phiên làm việc có thể đã hết hạn. Vui lòng thử lại hoặc tải lại trang.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: '10px 24px',
                  background: '#FA865E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Thử lại
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
