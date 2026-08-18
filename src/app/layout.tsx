import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { BackgroundImage } from "@/components/BackgroundImage";
import QueryProvider from "@/lib/query-provider";

// maximumScale: 1 ngăn iOS Safari tự phóng to trang khi chạm vào ô nhập
// (người dùng vẫn véo tay để zoom được vì iOS bỏ qua giới hạn này khi pinch)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Giáo Xứ Thiên Ân - Quản Lý Thiếu Nhi",
  description: "Ứng dụng quản lý thiếu nhi Giáo Xứ Thiên Ân",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var h = document.documentElement;
                var stored = localStorage.getItem('darkMode');
                var isDark = stored === null ? true : stored === 'true';
                if (isDark) { h.classList.add('dark'); } else { h.classList.remove('dark'); }
                try {
                  var ds = JSON.parse(localStorage.getItem('thien_an_display_settings') || '{}');
                  if (ds.fontSize === 'small') h.classList.add('font-size-small');
                  else if (ds.fontSize === 'large') h.classList.add('font-size-large');
                  if (ds.isCompactMode) h.classList.add('compact-mode');
                  if (ds.isHighContrast) h.classList.add('high-contrast');
                  if (ds.reduceMotion) h.classList.add('reduce-motion');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider>
            <BackgroundImage />
            <AuthProvider>
              <div className="relative z-10 min-h-screen">
                {children}
              </div>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
