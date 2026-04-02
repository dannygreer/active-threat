import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Active Threat Response Training',
  icons: {
    icon: '/active-threat/icon.png',
  },
};

export default function ActiveThreatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
