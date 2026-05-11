export const ROLES = ["volunteer", "staff", "ambulatorium", "admin"];

export const ROLE_LABELS = {
  volunteer: "Wolontariusz",
  staff: "Pracownik",
  ambulatorium: "Ambulatorium",
  admin: "Admin",
};

export function canEditMap(role) {
  return role === "admin";
}

export function canSetMedicalFlags(role) {
  return role === "ambulatorium" || role === "admin";
}

export function canViewMedicalNotes(role) {
  return role === "ambulatorium" || role === "staff" || role === "admin";
}
