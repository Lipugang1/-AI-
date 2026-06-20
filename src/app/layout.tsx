import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '三合一管理系统',
  description: '物资后勤中心 · 统一管理平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
