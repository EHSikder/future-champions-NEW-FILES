import './globals.css';
import ConditionalHeader from '@/components/layout/ConditionalHeader';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Future Champions — Predict & Win $1,000',
  description: 'Predict FIFA World Cup match results, earn points across every round, and compete for $1,000 and exclusive vouchers in the Future Champions Prediction Challenge.',
  keywords: 'future champions, world cup prediction, win money, football prediction, FIFA 2026',
  openGraph: {
    title: 'Future Champions — Predict & Win $1,000',
    description: 'Join the Future Champions Prediction Challenge. Predict match results, earn bonus points, and win prizes in every round.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.variable}>
        <LanguageProvider>
          <AuthProvider>
            <ConditionalHeader />
            <main>{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
