import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleeterzen - Fleet Management',
  description: 'Production-ready logistics management platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
