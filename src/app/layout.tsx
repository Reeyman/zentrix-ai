import "./globals.css";
import PwaRegistration from "@/components/PwaRegistration";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Zentrix AI - Intelligent Advertising Workspace</title>
        <link rel="icon" href="/icon.svg?v=3" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon.svg?v=3" />
        <meta name="application-name" content="Zentrix" />
        <meta name="apple-mobile-web-app-title" content="Zentrix" />
        <meta name="description" content="Zen-like calm intelligence for advertising operations. Experience the zen of optimized campaigns with AI-powered workflow automation." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0e1a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
