export default function ShoeDonationLoading() {
  return (
    <main className="public-site inner-site donation-site donation-loading" aria-busy="true">
      <div className="donation-loading__card" role="status">
        <span aria-hidden="true">✦</span>
        <strong>Loading Shoe Doctor&apos;s donation programme…</strong>
        <p>
          Preparing the latest drives, restoration stories, and verified
          impact.
        </p>
      </div>
    </main>
  );
}
