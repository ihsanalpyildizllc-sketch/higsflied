import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Higgsfield — Open Generative AI Studio",
  description:
    "A free, open generative AI studio for images, video and lip-sync. Self-hostable and fully customizable.",
};

export const viewport: Viewport = {
  themeColor: "#06070d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
