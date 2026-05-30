import { auth } from "@/lib/auth";
import { AdminTable } from "./AdminTable";

export default async function HubAdminPage() {
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="main-content" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 40, textAlign: "center", color: "var(--text-3)" }}>
          Admin access required.
        </div>
      </div>
    );
  }

  return <AdminTable />;
}
