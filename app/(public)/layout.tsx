import "@/app/globals.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-stone-50">{children}</div>;
}
