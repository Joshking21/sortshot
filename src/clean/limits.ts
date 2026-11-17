import { getSetting, setSetting } from '../db/queries';

const SETTING_KEY_DATE = 'cleanup_daily_date';
const SETTING_KEY_COUNT = 'cleanup_daily_count';
const SETTING_KEY_BONUS = 'cleanup_daily_bonus';

export const FREE_DAILY_LIMIT = 100;

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DailyLimitInfo {
  usedToday: number;
  totalLimitToday: number;
  remainingToday: number;
  isLimitReached: boolean;
}

export async function getDailyCleanLimitInfo(isPro = false): Promise<DailyLimitInfo> {
  if (isPro) {
    return {
      usedToday: 0,
      totalLimitToday: Infinity,
      remainingToday: Infinity,
      isLimitReached: false,
    };
  }

  const todayStr = getTodayString();
  const savedDate = await getSetting(SETTING_KEY_DATE);

  let used = 0;
  let bonus = 0;

  if (savedDate === todayStr) {
    const savedCount = await getSetting(SETTING_KEY_COUNT);
    const savedBonus = await getSetting(SETTING_KEY_BONUS);
    used = savedCount ? parseInt(savedCount, 10) || 0 : 0;
    bonus = savedBonus ? parseInt(savedBonus, 10) || 0 : 0;
  } else {
    // Reset for new day
    await setSetting(SETTING_KEY_DATE, todayStr);
    await setSetting(SETTING_KEY_COUNT, '0');
    await setSetting(SETTING_KEY_BONUS, '0');
  }

  const totalLimit = FREE_DAILY_LIMIT + bonus;
  const remaining = Math.max(0, totalLimit - used);

  return {
    usedToday: used,
    totalLimitToday: totalLimit,
    remainingToday: remaining,
    isLimitReached: remaining <= 0,
  };
}

export async function recordCleanDeletions(count: number): Promise<void> {
  const todayStr = getTodayString();
  const savedDate = await getSetting(SETTING_KEY_DATE);

  let currentUsed = 0;
  if (savedDate === todayStr) {
    const savedCount = await getSetting(SETTING_KEY_COUNT);
    currentUsed = savedCount ? parseInt(savedCount, 10) || 0 : 0;
  } else {
    await setSetting(SETTING_KEY_DATE, todayStr);
    await setSetting(SETTING_KEY_BONUS, '0');
  }

  const newUsed = currentUsed + count;
  await setSetting(SETTING_KEY_COUNT, newUsed.toString());
}

export async function addRewardedCleanBonus(bonusCount = 100): Promise<void> {
  const todayStr = getTodayString();
  const savedDate = await getSetting(SETTING_KEY_DATE);

  let currentBonus = 0;
  if (savedDate === todayStr) {
    const savedBonus = await getSetting(SETTING_KEY_BONUS);
    currentBonus = savedBonus ? parseInt(savedBonus, 10) || 0 : 0;
  } else {
    await setSetting(SETTING_KEY_DATE, todayStr);
    await setSetting(SETTING_KEY_COUNT, '0');
  }

  const nextBonus = currentBonus + bonusCount;
  await setSetting(SETTING_KEY_BONUS, nextBonus.toString());
}
