export function isAdmin(userId: number): boolean {
  const ADMIN_IDS = [1988220259];
  return ADMIN_IDS.includes(userId);
}
