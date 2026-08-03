import disbursementLogData from "../data/disbursement_log.json";

/**
 * Real output of Architecture Extension B's cryptographic-signing simulation
 * (data/disbursement_log.json), converted once into
 * src/data/disbursement_log.json. Not mock data - but a snapshot from a past
 * run, not a live feed. See SecurityAuditPanel.jsx for the caveat.
 */
export function useDisbursementLog() {
  return disbursementLogData;
}
