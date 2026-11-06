import { parseAdded } from "./added-companies";
import type { CompanyExtras } from "./companies";
import { readDoc } from "./doc-store";
import { parseSpvs } from "./spv";

/** Ryan's hand-logged companies and SPV companies, for the full company list. Server only. */
export async function loadCompanyExtras(): Promise<CompanyExtras> {
  const [added, spvs] = await Promise.all([readDoc("added-companies").catch(() => null), readDoc("spvs").catch(() => null)]);
  return { added: parseAdded(added).companies, spvs: parseSpvs(spvs).spvs };
}
