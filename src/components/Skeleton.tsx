export function PageSkeleton() {
  return (
    <div className="wrap wrap-narrow grid gap-4 py-10" aria-busy="true">
      <div className="skeleton" style={{ width: "60%", height: 32 }} />
      <div className="skeleton" style={{ width: "40%" }} />
      <div className="skeleton" style={{ height: 200 }} />
    </div>
  );
}
