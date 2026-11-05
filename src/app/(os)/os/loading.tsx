export default function OsLoading() {
  return (
    <div className="load-shell" aria-busy="true" aria-label="Loading">
      <div className="appbar" />
      <div className="skel">
        <div className="skel-title" />
        <div className="skel-card" />
        <div className="skel-card" />
      </div>
      <div className="tabbar" />
    </div>
  );
}
