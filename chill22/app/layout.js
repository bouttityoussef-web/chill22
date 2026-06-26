import './globals.css';

export const metadata = {
  title: 'ProMax IPTV',
  description: 'Premium IPTV Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
