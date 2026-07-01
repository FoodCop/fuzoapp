import type { GamificationState, Requirement, Badge, Role, Achievement } from '../types/gamification';

export const XP_PER_LEVEL = 300;
export const ROMAN_NUMERALS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function reqProgress(req: Requirement, stats: GamificationState['stats']): number {
  const val = stats[req.stat];
  if (req.target === true) return val === true ? 1 : 0;
  return clamp01(((val as number) || 0) / (req.target as number));
}

export function isReqDone(req: Requirement, stats: GamificationState['stats']): boolean {
  return reqProgress(req, stats) >= 1;
}

export function badgeProgress(badge: Badge, stats: GamificationState['stats']): number {
  if (badge.reqs.length === 0) return 0;
  const sum = badge.reqs.reduce((s, r) => s + reqProgress(r, stats), 0);
  return sum / badge.reqs.length;
}

export function isBadgeEarned(badge: Badge, stats: GamificationState['stats']): boolean {
  return badge.reqs.every(req => isReqDone(req, stats));
}

export function roleEarnedCount(role: Role, stats: GamificationState['stats']): number {
  return role.badges.filter(b => isBadgeEarned(b, stats)).length;
}

export function roleRankLabel(role: Role, stats: GamificationState['stats']): string {
  const count = roleEarnedCount(role, stats);
  return count === 0 ? `${role.rankName} \u2014 Unranked` : `${role.rankName} ${ROMAN_NUMERALS[count]}`;
}

export function getNewlyUnlockedKeys(
  currentState: GamificationState,
  roles: Role[],
  achievements: Achievement[]
): { keys: Record<string, boolean>, unlocked: { title: string, reward: string }[] } {
  const nowKeys: Record<string, boolean> = {};
  const newlyUnlocked: { title: string, reward: string }[] = [];

  // Check roles
  roles.forEach(role => {
    role.badges.forEach((b, i) => {
      if (isBadgeEarned(b, currentState.stats)) {
        const key = `${role.key}:${i}`;
        nowKeys[key] = true;
        if (!currentState.earnedBefore[key]) {
          newlyUnlocked.push({ title: b.title, reward: b.reward });
        }
      }
    });
  });

  // Check achievements
  achievements.forEach((a, i) => {
    if (!a.future && a.stat && a.target !== null) {
      const val = (currentState.stats[a.stat] as number) || 0;
      if (val >= a.target) {
        const key = `ach:${i}`;
        nowKeys[key] = true;
        if (!currentState.earnedBefore[key]) {
          newlyUnlocked.push({ title: a.title, reward: 'Achievement unlocked' });
        }
      }
    }
  });

  return { keys: nowKeys, unlocked: newlyUnlocked };
}
