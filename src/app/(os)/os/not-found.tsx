import { headers } from "next/headers";
import { isOsHost } from "@/lib/os/host";

export default async function OsNotFound() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const href = isOsHost(host) ? "/" : "/os";
  return (
    <main className="os-login">
      <p className="os-kicker">Backfield OS</p>
      <h1>Missing page</h1>
      <p className="os-lede">That address is not part of the operating system.</p>
      <a className="os-btn os-btn-solid" href={href}>
        Back to today
      </a>
    </main>
  );
}
