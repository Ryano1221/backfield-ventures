const CRM_TIMEOUT_MS = 5000;

function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`CRM write timed out after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve(work), timeout]).finally(() => clearTimeout(timer));
}

// Email is the record of a pitch. A CRM failure, including a paused Supabase
// project, must not turn a delivered email into a failed request.
export async function deliverPitch(options: {
  notify: () => Promise<boolean>;
  writeCrm: () => Promise<void>;
  crmTimeoutMs?: number;
  log?: { company?: string; founderEmail?: string };
}): Promise<boolean> {
  const emailed = await options.notify().catch((e) => {
    console.error("pitch email error", e);
    return false;
  });

  try {
    await withTimeout(options.writeCrm(), options.crmTimeoutMs ?? CRM_TIMEOUT_MS);
  } catch (err) {
    console.error("pitch CRM write skipped (best-effort)", err);
  }

  if (!emailed) {
    console.error(
      "pitch NOT delivered by email",
      JSON.stringify({ company: options.log?.company, founderEmail: options.log?.founderEmail }),
    );
    return false;
  }
  return true;
}
