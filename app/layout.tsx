import Layout from "./components/Layout";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "Proof Of Physical Attendance Protocol",
  description:
    "Create and manage events with blockchain-verified physical attendance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} font-sans`}>
      <body className="bg-gray-900 text-white">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
