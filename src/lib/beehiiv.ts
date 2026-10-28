// One beehiiv subscription create. Never throws. Callers decide whether the
// flag is on. Missing credentials skip the network and return missing_config.

const BEEHIIV_TIMEOUT_MS = 5000;

export type BeehiivSubscriptionInput = {
  email: string;
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referringSite: string;
};

export type BeehiivSubscriptionResult = {
  ok: boolean;
  status: number;
  id?: string;
  error?: string;
};

type BeehiivPayload = {
  email: string;
  reactivate_existing: false;
  send_welcome_email: false;
  double_opt_override: "on" | "off" | "not_set";
  utm_source: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referring_site?: string;
  custom_fields?: { name: string; value: string }[];
};

function clipError(value: string) {
  const clipped = value
    .replace(/bearer\s+\S+/gi, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/[^\w.-]+/g, " ")
    .trim()
    .slice(0, 80);
  return clipped || "error";
}

function doubleOptOverride(): BeehiivPayload["double_opt_override"] {
  const value = process.env.HANDOFF_BEEHIIV_DOUBLE_OPT?.trim() ?? "";
  if (value === "on" || value === "off" || value === "not_set") return value;
  return "on";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function putOptional(
  payload: BeehiivPayload,
  key: "utm_medium" | "utm_campaign" | "utm_term" | "utm_content" | "referring_site",
  value: string,
) {
  if (value) payload[key] = value;
}

async function shortBeehiivError(res: Response) {
  try {
    const data = (await res.json()) as {
      statusText?: unknown;
      errors?: { code?: unknown }[];
    };
    const code = data.errors?.find((item) => typeof item?.code === "string" && item.code.trim())?.code;
    if (typeof code === "string") return clipError(code);
    if (typeof data.statusText === "string" && data.statusText.trim()) return clipError(data.statusText);
  } catch {
    // Status is enough when the body is empty or not JSON.
  }
  return `http_${res.status}`;
}

export async function createBeehiivSubscription(
  input: BeehiivSubscriptionInput,
): Promise<BeehiivSubscriptionResult> {
  const apiKey = process.env.BEEHIIV_API_KEY?.trim() ?? "";
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID?.trim() ?? "";
  if (!apiKey || !publicationId) {
    return { ok: false, status: 0, error: "missing_config" };
  }

  const { firstName, lastName } = splitName(input.name);
  const payload: BeehiivPayload = {
    email: input.email,
    reactivate_existing: false,
    send_welcome_email: false,
    double_opt_override: doubleOptOverride(),
    utm_source: input.utmSource || "handoff-public",
  };
  putOptional(payload, "utm_medium", input.utmMedium);
  putOptional(payload, "utm_campaign", input.utmCampaign);
  putOptional(payload, "utm_term", input.utmTerm);
  putOptional(payload, "utm_content", input.utmContent);
  putOptional(payload, "referring_site", input.referringSite);

  const customFields: { name: string; value: string }[] = [];
  if (firstName) customFields.push({ name: "First Name", value: firstName });
  if (lastName) customFields.push({ name: "Last Name", value: lastName });
  if (customFields.length) payload.custom_fields = customFields;

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/subscriptions`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(BEEHIIV_TIMEOUT_MS),
      },
    );

    if (res.ok) {
      let id: string | undefined;
      try {
        const data = (await res.json()) as { data?: { id?: unknown } };
        if (typeof data?.data?.id === "string") id = data.data.id;
      } catch {
        id = undefined;
      }
      return id ? { ok: true, status: res.status, id } : { ok: true, status: res.status };
    }

    return { ok: false, status: res.status, error: await shortBeehiivError(res) };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, status: 0, error: "timeout" };
    }
    return { ok: false, status: 0, error: "network" };
  }
}
