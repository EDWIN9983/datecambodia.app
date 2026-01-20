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
      <head>
	  <link rel="icon" href="/favicon.ico" />
	  <link rel="manifest" href="/manifest.json" />
	  <meta name="theme-color" content="#0f172a" />
	  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-gray-100 text-black">
        {children}

        <script
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyChPGTqjXPTbi6B5ZJRgK87FKfrTBPrzgw&libraries=places"
          async
          defer
        ></script>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              let deferredPrompt;
              window.addEventListener("beforeinstallprompt", (e) => {
                e.preventDefault();
                deferredPrompt = e;
                window.deferredPrompt = e;
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
