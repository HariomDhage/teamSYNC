import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "TeamSync - Workspace Collaboration Platform",
    description: "Organize your teams and manage access control with ease",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.Node;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Toaster position="top-right" />
            </body>
        </html>
    );
}
