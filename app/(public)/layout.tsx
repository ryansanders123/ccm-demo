import "@/app/globals.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-backdrop px-4 py-10">
      {children}
    </div>
  );
}
