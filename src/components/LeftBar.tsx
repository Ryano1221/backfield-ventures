import Image from "next/image";

export default function LeftBar() {
  return (
    <aside className="left-bar" aria-hidden="true">
      <span className="left-bar__label">Backfield Ventures: Consumer &amp; Sports VC</span>
      <div className="left-bar__bottom">
        <Image
          src="/logo-bw.png"
          alt=""
          width={1484}
          height={950}
          className="left-bar__bottom-logo"
        />
      </div>
    </aside>
  );
}
