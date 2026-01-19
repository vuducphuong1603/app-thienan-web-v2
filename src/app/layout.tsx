import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

const interTight = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Giáo Xứ Thiên Ân - Quản Lý Thiếu Nhi",
  description: "Ứng dụng quản lý thiếu nhi Giáo Xứ Thiên Ân",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${interTight.variable} font-sans antialiased`} suppressHydrationWarning>
        {/* Background Image - Global */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(/images/background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <AuthProvider>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
