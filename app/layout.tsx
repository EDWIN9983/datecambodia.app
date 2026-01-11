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
      <body className="bg-gray-100 text-black">
        {children}

        {/* Google Maps Places API */}
        <script
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyChPGTqjXPTbi6B5ZJRgK87FKfrTBPrzgw&libraries=places"
          async
          defer
        ></script>
      </body>
    </html>
  );
}
