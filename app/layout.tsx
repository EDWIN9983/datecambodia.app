import "./globals.css";

export const metadata = {
  title: "Date Cambodia",
  description: "Dating app for Cambodia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-black">{children}</body>
    </html>
  );
}
