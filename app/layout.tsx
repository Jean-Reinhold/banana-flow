import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BananaFlow - Gemini Node Workflow',
  description: 'Visual workflow editor for AI-powered image and text generation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
