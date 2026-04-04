import { TopNav } from "@/components/layout/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#080d19", color: "#cbd5e1" }}>
      <TopNav />
      <main
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "20px 12px 60px",
        }}
        className="main-content"
      >
        {children}
      </main>
    </div>
  );
}
