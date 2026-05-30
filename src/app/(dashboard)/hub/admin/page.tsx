import { auth } from "@/lib/auth";
import { AdminTable } from "./AdminTable";

export default async function HubAdminPage() {
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div className="main-content" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 40, textAlign: "center", color: "#64748b" }}>
          Admin access required.
        </div>
      </div>
    );
  }

  return <AdminTable />;
}
