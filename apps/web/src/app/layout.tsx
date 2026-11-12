import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Forja Selvagem',
    template: '%s · Forja Selvagem',
  },
  description: 'Campanhas, fichas, NPCs, eventos e rolagens de Savage Worlds em um só lugar.',
  applicationName: 'Forja Selvagem',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
