import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bandwise | IELTS Teaching Studio",
  description: "Writing and speaking assessment, teacher feedback and student progress.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
