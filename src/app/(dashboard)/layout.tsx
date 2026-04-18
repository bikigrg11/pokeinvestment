import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

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
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "28px 28px 60px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
