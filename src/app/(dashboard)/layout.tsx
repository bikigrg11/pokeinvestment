import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Header />
        <main
          className="main-content"
          style={{
            maxWidth: 1400,
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
