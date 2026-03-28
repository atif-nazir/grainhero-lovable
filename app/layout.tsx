import type { ReactNode } from 'react';

// Since we have a root layout in app/[locale]/layout.tsx, 
// this top-level layout merely passes children through to the localized layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
