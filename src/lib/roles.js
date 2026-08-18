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

export function canMoveDog(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}

export function canViewSector(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}

export function canReleaseDog(role) {
  return role === "staff" || role === "admin";
}

export function canEditDiet(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}

export function canCompleteTask(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}

export function canEditStatus(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}

export function canViewWalkReport(role) {
  return role === "staff" || role === "ambulatorium" || role === "admin";
}
