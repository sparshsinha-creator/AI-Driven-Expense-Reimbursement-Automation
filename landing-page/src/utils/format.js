export function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABELS = {
  auto_approved: "Auto-Approved",
  pending_manager_approval: "Pending Manager",
  pending_finance_approval: "Pending Finance",
  rejected: "Rejected",
  processing: "Processing",
};

export function formatStatus(routedStatus) {
  return STATUS_LABELS[routedStatus] ?? routedStatus;
}

const STATUS_TONES = {
  auto_approved: "success",
  pending_manager_approval: "warning",
  pending_finance_approval: "warning",
  rejected: "danger",
  processing: "neutral",
};

export function statusTone(routedStatus) {
  return STATUS_TONES[routedStatus] ?? "neutral";
}

const RISK_TONES = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export function riskTone(riskScore) {
  return RISK_TONES[riskScore] ?? "neutral";
}

const CATEGORY_LABELS = {
  meals: "Meals",
  lodging: "Lodging",
  ground_transport: "Ground Transport",
  airfare: "Airfare",
  mileage: "Mileage",
  per_diem: "Per Diem",
  office_supplies: "Office Supplies",
};

export function formatCategory(category) {
  return CATEGORY_LABELS[category] ?? category;
}
