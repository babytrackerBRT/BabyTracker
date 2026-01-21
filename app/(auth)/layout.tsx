export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-4 pt-10 pb-10">
        {children}
      </div>
    </div>
  );
}
