import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | Mov33',
  description: 'Complete your purchase for tickets to events, tours, and merchandise from Mov33.',
  robots: {
    index: false,
    follow: false,
  }
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
