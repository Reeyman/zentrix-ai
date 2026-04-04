import { AppShell } from '@/components/layout/AppShell';
import { requireWorkspace } from '@/lib/auth';

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWorkspace();

  return <AppShell>{children}</AppShell>;
}
