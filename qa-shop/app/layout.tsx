import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QA Shop", template: "%s · QA Shop" },
  description: "Ứng dụng e-commerce mẫu để luyện kiểm thử thủ công, API và UI automation.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SessionProvider>
          <Header />
          <main id="main" className="container">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
