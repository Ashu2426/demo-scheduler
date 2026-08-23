import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSMS — Demo Schedule & Management",
  description: "Schedule product demos, protect shared environments, and track pre-demo issues.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
