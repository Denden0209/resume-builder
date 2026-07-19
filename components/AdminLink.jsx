import { getUser } from "@/lib/supabase/server";

// Server component: shows the Admin nav link only for the owner account
export default async function AdminLink() {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return null;
  const user = await getUser();
  if (!user?.email || user.email.toLowerCase() !== ownerEmail.toLowerCase()) return null;
  return <a href="/admin" style={{ color: "var(--bright)" }}>⌘ Admin</a>;
}
