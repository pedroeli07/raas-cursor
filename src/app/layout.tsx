import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import ConsoleFilterInit from "@/components/ConsoleFilterInit";
import AuthProvider from "@/components/providers/auth-provider";

export const metadata = {
  title: 'RaaS Solar - Energia Limpa e Inteligente',
  description: 'Conectando usinas solares a consumidores. Economize na conta de luz com energia renovável.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ConsoleFilterInit />
            {children}
            <Toaster 
              richColors 
              position="top-center" 
              closeButton 
              duration={3000} 
              theme="light" 
              visibleToasts={3}
              expand={false}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}