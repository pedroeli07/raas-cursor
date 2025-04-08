import { GeistSans, GeistMono } from "@geist-ui/react";
import { ThemeProvider } from "next-themes";
import Navbar from "./components/Navbar";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <Navbar />
          <main>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Dummy components for compilation
const Navbar = () => <div>Navbar</div>;