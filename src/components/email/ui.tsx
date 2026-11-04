import type { ReactNode } from "react";

export function SampleTag() {
  return <span className="sample">sample</span>;
}

export function PageHead({
  title,
  lede,
  primary,
}: {
  title: string;
  lede?: ReactNode;
  primary: ReactNode;
}) {
  return (
    <div className="top">
      <div>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      <div className="primary-wrap">{primary}</div>
    </div>
  );
}
