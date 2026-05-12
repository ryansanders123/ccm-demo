import type { DetectionScore, Mapping, TargetField } from "./types";
import { DEFAULT_EMAIL_BLOCKLIST } from "./types";

// Synonym table — see spec 2026-05-11 for the rationale.
// Headers are case-insensitive, whitespace-folded, punctuation-stripped
// before comparison.
const SYNONYMS: Record<TargetField, string[]> = {
  amount: ["amount", "amt", "txn amt", "txnamt", "gift amount", "donation amount", "total"],
  date_received: ["date", "transaction date", "gift date", "txn dt", "txndt", "date received", "deposit date"],
  type: ["type", "payment method", "payment type", "method"],
  external_id: ["transaction id", "txn id", "txnid", "gift id", "reference", "receipt", "transaction number", "transactionnumber"],
  check_number: ["check number", "check no", "check num"],
  reference_id: ["reference id", "ref id", "payment id", "stripe id"],
  // "gl code" is intentionally NOT a synonym: it's a financial ledger
  // code, not a fund name (the user can map it manually if they want).
  fund_name: ["fund", "designation", "fund name"],
  campaign_name: ["campaign", "campaign name"],
  appeal_name: ["appeal", "appeal name", "event"],
  note: ["note", "memo", "comments", "comment"],
  // "donor" alone is too greedy (matches "Donor covered fee", "Donor ID",
  // etc.). Require more context for the donor_name field.
  donor_name: ["donor name", "donor full name", "full name", "constituent name", "name"],
  donor_first_name: ["first name", "first", "fname", "given name"],
  donor_last_name: ["last name", "last", "lname", "surname", "family name"],
  donor_company: ["company", "organization", "company name", "employer"],
  donor_email: ["email", "email address", "e mail"],
  donor_phone: ["phone", "telephone", "mobile", "cell"],
  donor_address_line1: ["address", "address1", "address line 1", "street", "street address"],
  donor_address_line2: ["address2", "address line 2", "apt", "suite"],
  donor_city: ["city", "town"],
  donor_state: ["state", "region", "province"],
  donor_zip: ["zip", "zipcode", "postal", "postal code"],
  donor_external_id: ["profile id", "constituent id", "donor id", "account number", "source id"],
};

function normalizeHeader(s: string): string {
  return s
    // Split camelCase / PascalCase so "TransactionNumber" → "Transaction Number".
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_\-./]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHeader(header: string, synonym: string): number {
  const h = normalizeHeader(header);
  const s = normalizeHeader(synonym);
  if (!h || !s) return 0;
  if (h === s) return 1.0;

  // "Substring" match must respect word boundaries — otherwise
  // "donor covered fee" matches the "donor" synonym for donor_name.
  const hTokens = h.split(" ");
  const sTokens = s.split(" ").filter((t) => t.length > 1);
  if (sTokens.length === 0) return 0;
  const hTokenSet = new Set(hTokens);
  const allHit = sTokens.every((t) => hTokenSet.has(t));
  if (allHit) {
    // 1.0 for exact equality (handled above); 0.8 when the header has
    // extra tokens (e.g. "transaction date stamp" still maps to "transaction date").
    return 0.8;
  }
  // Partial hit: half the synonym's tokens are present and the synonym
  // is a single token (cover "Address" → "donor_address_line1" via "address").
  if (sTokens.length === 1 && hTokenSet.has(sTokens[0])) return 0.6;
  return 0;
}

// Returns the best (field, column, confidence) for each header.
// Greedy: each column maps to at most one field, and each field is
// claimed by at most one column (whichever scored highest).
export function autoDetect(headers: string[]): DetectionScore[] {
  const candidates: DetectionScore[] = [];
  for (const header of headers) {
    for (const [fieldRaw, synonyms] of Object.entries(SYNONYMS)) {
      const field = fieldRaw as TargetField;
      let best = 0;
      for (const syn of synonyms) {
        const s = scoreHeader(header, syn);
        if (s > best) best = s;
      }
      if (best > 0) candidates.push({ field, column: header, confidence: best });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);

  const claimedFields = new Set<TargetField>();
  const claimedColumns = new Set<string>();
  const picks: DetectionScore[] = [];
  for (const c of candidates) {
    if (claimedFields.has(c.field) || claimedColumns.has(c.column)) continue;
    picks.push(c);
    claimedFields.add(c.field);
    claimedColumns.add(c.column);
  }
  return picks;
}

// Build a starter Mapping from auto-detection. Caller refines in the UI.
export function detectionsToMapping(detections: DetectionScore[]): Mapping {
  const columns: Mapping["columns"] = {};
  for (const d of detections) columns[d.field] = d.column;
  return {
    columns,
    // Default type is "cash" because it has no required side fields
    // (check needs check_number, online needs reference_id). Users
    // override in the Map step when their CSV is from a known source
    // (GiveCentral → online, etc.).
    constants: { type: "cash" },
    matchDoneeByNameAddress: true,
    emailBlocklist: DEFAULT_EMAIL_BLOCKLIST,
  };
}
