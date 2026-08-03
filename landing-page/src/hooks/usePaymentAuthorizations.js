import paymentAuthorizationsData from "../data/payment_authorizations.json";

/**
 * Real output of Architecture Extension B's cryptographic-signing simulation
 * (data/payment_authorizations.json), converted once into
 * src/data/payment_authorizations.json. Not mock data - but a snapshot from
 * a past run, not a live feed. See SecurityAuditPanel.jsx for the caveat.
 */
export function usePaymentAuthorizations() {
  return paymentAuthorizationsData;
}
