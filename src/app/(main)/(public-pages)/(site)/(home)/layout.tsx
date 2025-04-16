import React from 'react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import CookieConsent from '@/components/shared/CookieConsent';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen min-w-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}