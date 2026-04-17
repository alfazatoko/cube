import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

function getWibDate(): string {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffset);
  const y = wibDate.getUTCFullYear();
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wibDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const autoLockReports = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Jakarta")
  .onRun(async () => {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const currentHour = wibDate.getUTCHours();
    const currentMinute = wibDate.getUTCMinutes();

    const settingsDoc = await db.collection("settings").doc("main").get();
    if (!settingsDoc.exists) return null;
    const settings = settingsDoc.data();
    if (!settings) return null;

    const lockHour = settings.autoLockHour ?? 22;
    const lockMinute = settings.autoLockMinute ?? 0;

    if (currentHour === lockHour && currentMinute === lockMinute) {
      const today = getWibDate();
      const usersSnap = await db.collection("users").get();
      const batch = db.batch();

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.role === "kasir" && userData.isActive) {
          const kasirName = userData.name;
          const snapshotRef = db.collection("daily_snapshots").doc(`${kasirName}_${today}`);
          batch.set(snapshotRef, {
            locked: true,
            lockedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      await batch.commit();
      console.log(`Reports locked at ${currentHour}:${currentMinute} WIB for date ${today}`);
    }

    return null;
  });

export const autoResetBalances = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Jakarta")
  .onRun(async () => {
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    const currentHour = wibDate.getUTCHours();
    const currentMinute = wibDate.getUTCMinutes();

    const settingsDoc = await db.collection("settings").doc("main").get();
    if (!settingsDoc.exists) return null;
    const settings = settingsDoc.data();
    if (!settings) return null;

    const resetHour = settings.autoResetHour ?? 6;
    const resetMinute = settings.autoResetMinute ?? 0;

    if (currentHour === resetHour && currentMinute === resetMinute) {
      const usersSnap = await db.collection("users").get();
      const batch = db.batch();
      const zeroBalance = {
        bank: 0,
        cash: 0,
        tarik: 0,
        aks: 0,
        adminTotal: 0,
        bankNonTunai: 0,
        cashNonTunai: 0,
        tarikNonTunai: 0,
        aksNonTunai: 0,
      };

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.role === "kasir" && userData.isActive) {
          const kasirName = userData.name;
          const balanceRef = db.collection("balances").doc(kasirName);
          batch.set(balanceRef, zeroBalance);
        }
      }

      await batch.commit();
      console.log(`Balances reset at ${currentHour}:${currentMinute} WIB`);
    }

    return null;
  });
