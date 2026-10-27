export const PITCH_NOT_SENT_MESSAGE =
  "Something went wrong and your pitch didn't send. Please try again.";

export const PITCH_SUBMIT_TIMEOUT_MS = 30_000;

// Confirmed success is a 2xx response whose JSON body is { ok: true }
// and does not also report an error. Anything else is a failed send.
export function pitchSubmissionSucceeded(status: number, body: unknown): boolean {
  if (!(status >= 200 && status < 300)) return false;
  if (body === null || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  if (record.ok !== true) return false;
  if (record.success === false) return false;
  if (typeof record.error === "string" && record.error.trim() !== "") return false;
  return true;
}

// Vanilla copy used by the home-page drawer script. Keep it behavior-identical
// to pitchSubmissionSucceeded; the unit test runs both against the same cases.
export const pitchSubmissionSucceededSource = `function pitchSubmissionSucceeded(status, body) {
  if (!(status >= 200 && status < 300)) return false;
  if (body === null || typeof body !== "object") return false;
  if (body.ok !== true) return false;
  if (body.success === false) return false;
  if (typeof body.error === "string" && body.error.trim() !== "") return false;
  return true;
}`;

type PitchFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function postPitch(
  payload: unknown,
  options?: { fetchImpl?: PitchFetch; timeoutMs?: number },
): Promise<{ ok: true } | { ok: false }> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? PITCH_SUBMIT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl("/api/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!pitchSubmissionSucceeded(res.status, body)) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
