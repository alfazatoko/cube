import { useEffect, useRef } from "react";
import { getSettings, getUsers, lockReport, resetBalance } from "@/lib/firestore";
import { getWibDate } from "@/lib/utils";

function getWibNow(): { hour: number; minute: number } {
  const now = new Date();
  const wibOffset = 7 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);
  return { hour: Math.floor(wibMinutes / 60), minute: wibMinutes % 60 };
}

export function useAutoScheduler(isLoggedIn: boolean) {
  const lastLockCheck = useRef("");
  const lastResetCheck = useRef("");

  useEffect(() => {
    if (!isLoggedIn) return;

    const checkSchedules = async () => {
      try {
        const settings = await getSettings();
        const { hour, minute } = getWibNow();
        const today = getWibDate();
        const timeKey = `${today}_${hour}:${minute}`;

        if (hour === settings.autoLockHour && minute === settings.autoLockMinute && lastLockCheck.current !== timeKey) {
          lastLockCheck.current = timeKey;
          const users = await getUsers();
          const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
          for (const k of kasirList) {
            try {
              await lockReport(k.name, today);
            } catch {}
          }
        }

        if (hour === settings.autoResetHour && minute === settings.autoResetMinute && lastResetCheck.current !== timeKey) {
          lastResetCheck.current = timeKey;
          const users = await getUsers();
          const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
          for (const k of kasirList) {
            try {
              await resetBalance(k.name);
            } catch {}
          }
        }
      } catch {}
    };

    checkSchedules();
    const interval = setInterval(checkSchedules, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);
}
