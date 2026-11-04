import type { Metadata } from "next";
import { CopyButton } from "@/components/email/CopyButton";
import { SignupTry } from "@/components/email/SignupTry";
import { PageHead, SampleTag } from "@/components/email/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signup forms | Backfield OS",
  robots: { index: false, follow: false },
};

const EMBED = `<form id="bfv-handoff-signup">
  <label>First name <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <button type="submit">Subscribe</button>
</form>
<script>
document.getElementById("bfv-handoff-signup").addEventListener("submit", function (event) {
  event.preventDefault();
  var data = new FormData(event.currentTarget);
  fetch("/api/email/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.get("name"),
      email: data.get("email"),
      list: "handoff",
      optInHandoff: false
    })
  });
});
</script>`;

export default function SignupFormsPage() {
  return (
    <>
      <PageHead
        title="Signup forms"
        lede={
          <>
            Embed for the public signup endpoint. <SampleTag />
          </>
        }
        primary={<CopyButton primary label="Copy embed" value={EMBED} />}
      />
      <section className="card">
        <div className="h">
          <span className="lbl">The Handoff</span>
        </div>
        <p className="block">The live signup form on the site is unchanged. This preview posts to the new endpoint only.</p>
        <SignupTry list="handoff" buttonLabel="Try this signup" />
        <pre className="embed">{EMBED}</pre>
      </section>
    </>
  );
}
