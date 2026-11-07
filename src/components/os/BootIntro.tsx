/**
 * The Backfield intro: the BV mark slams in, a green streak wipes behind it and
 * yard lines rush past, with a progress bar running underneath. Shown after
 * signing in and when the OS opens from the phone's home screen. Pure CSS; it
 * holds still under reduced motion.
 */
export function BootIntro({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`boot ${className}`} role="status" aria-live="polite" aria-label={label}>
      <div className="boot-field" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="boot-yard" style={{ left: `${i * 10 - 10}%`, animationDelay: `${-i * 0.09}s` }} />
        ))}
      </div>
      <div className="boot-stage" aria-hidden="true">
        <span className="boot-streak" />
        <span className="boot-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bv-mark.png" alt="" width={560} height={230} />
        </span>
      </div>
      <div className="boot-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
