export default function AdminActivityLoading() {
  return (
    <main className="admin-shell admin-management-shell" aria-busy="true">
      <section className="admin-welcome admin-welcome--compact">
        <div>
          <p className="section-kicker">Super Admin only</p>
          <h1>ADMIN<br />ACTIVITY.</h1>
          <p>Loading immutable activity records...</p>
        </div>
      </section>
    </main>
  );
}
