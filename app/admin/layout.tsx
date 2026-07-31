import { createClient } from '../../lib/supabase-server';
import { redirect } from 'next/navigation';

/**
 * Server-side admin layout — defense-in-depth.
 *
 * This layout runs on the server BEFORE any admin page component renders.
 * It verifies the user's identity via getUser() (cryptographic round-trip)
 * and checks the admin role in the profiles table.
 *
 * Even if a client-side auth check is bypassed (e.g. via browser DevTools),
 * Next.js will not render the page without this server-side gate passing.
 *
 * The individual admin pages retain their client-side useEffect checks as
 * a secondary layer, but they are no longer the sole auth boundary.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
