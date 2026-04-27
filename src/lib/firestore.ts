import {
  collection as fbCollection, doc as fbDoc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  setDoc, query, where
} from "firebase/firestore/lite";
import { db, auth } from "./firebase";
import { getWibDate } from "./utils";

// ═══════════════════════════════════════════════════════════
// CORE HELPERS — Flat Collections + field `uid`
// Struktur: transactions/{docId} { uid, ... }
// Isolasi data via: where("uid", "==", uid)
// ═══════════════════════════════════════════════════════════

/** UID user aktif, atau null jika belum login */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

/** UID user aktif, atau throw error jika belum login */
function requireUid(): string {
  // Prioritaskan auth.currentUser (SDK), fallback ke localStorage jika ada race condition
  const uid = auth.currentUser?.uid ?? localStorage.getItem("kasir_tenant_id");
  if (!uid) throw new Error("Sesi Anda telah habis. Silakan login ulang.");
  return uid;
}

/**
 * Document reference — Subcollection Architecture!
 * Semua data disimpan di dalam `users/{uid}/{collection}/...`
 */
const doc = (dbOrCol: any, name: string, ...segments: string[]): any => {
  if (dbOrCol !== db) {
    return fbDoc(dbOrCol, name, ...segments);
  }
  // Koleksi global — tidak perlu isolasi user
  if (name === "licenses" || name === "freeTrials" || name === "system") {
    return fbDoc(db, name, ...segments);
  }
  // Data user terisolasi secara root
  const uid = requireUid();
  return fbDoc(db, "users", uid, name, ...segments);
};

/** Flat collection reference — Subcollection Architecture! */
export const getTenantCollection = (_db: any, name: string) => {
  const uid = requireUid();
  return fbCollection(db, "users", uid, name);
};

export function getUserCollection(name: string) {
  const uid = requireUid();
  return fbCollection(db, "users", uid, name);
}

export interface UserRecord {
  id: string;
  name: string;
  role: string;
  pin: string;
  isActive: boolean;
}

export interface LicenseRecord {
  id: string;
  type: "demo" | "4_months" | "lifetime";
  createdAt: string;
  expiresAt: string | null;
  maxDevices: number;
  activeDevices: string[];
  registeredEmail?: string;
  status: "active" | "expired" | "revoked";
}

export interface CustomCategory {
  id: string;
  name: string;
  type: "bank" | "tarik" | "aks";
  color: string;
}

export interface CategoryLabels {
  BANK: { name: string; visible: boolean };
  FLIP: { name: string; visible: boolean };
  APP: { name: string; visible: boolean };
  DANA: { name: string; visible: boolean };
  AKS: { name: string; visible: boolean };
  TARIK: { name: string; visible: boolean };
}

export interface SettingsRecord {
  shopName: string;
  logoUrl: string;
  profilePhotoUrl: string;
  address?: string;
  autoLockHour: number;
  autoLockMinute: number;
  autoResetHour: number;
  autoResetMinute: number;
  autoUnlockHour: number;
  autoUnlockMinute: number;
  mutiaraQuotes: string;
  runningText: string;
  pinEnabled: boolean;
  categoryLabels: CategoryLabels;
  requireLicense?: boolean;
  waNumber?: string;
  customCategories?: CustomCategory[];
}

export interface SystemConfigRecord {
  requireLicense?: boolean;
  waNumber?: string;
  lockOwnerMode?: boolean;
}

export interface TransactionRecord {
  id: string;
  uid: string;
  kasirName: string;
  category: string;
  categoryId?: string;
  nominal: number;
  admin: number;
  keterangan: string;
  transDate: string;
  transTime: string;
  paymentMethod: string;
  categoryType?: string;
  nominalTunai?: number;
  adminTunai?: number;
  nominalNonTunai?: number;
  adminNonTunai?: number;
  createdAt: string;
}

export interface SaldoHistoryRecord {
  id: string;
  uid: string;
  kasirName: string;
  jenis: string;
  nominal: number;
  keterangan: string;
  saldoDate: string;
  saldoTime: string;
  createdAt: any;
}

export interface BalanceRecord {
  bank: number;
  cash: number;
  tarik: number;
  aks: number;
  adminTotal: number;
  bankNonTunai: number;
  cashNonTunai: number;
  tarikNonTunai: number;
  aksNonTunai: number;
}

export interface HutangRecord {
  id: string;
  nama: string;
  nominal: number;
  keterangan?: string;
  tanggal: string;
  lunas: boolean;
  tglLunas?: string;
  createdBy?: string;
}

export interface KontakRecord {
  id: string;
  nama: string;
  nomor?: string;
  keterangan?: string;
  createdBy?: string;
}

export interface AttendanceRecord {
  id: string;
  kasirName: string;
  tanggal: string;
  shift: string;
  jamMasuk: string;
  createdAt: any;
}

export interface IzinRecord {
  id: string;
  nama: string;
  tanggal: string;
  alasan: string;
  status: string;
  createdAt: any;
}

export interface DailyNoteRecord {
  sisaSaldoBank: number;
  saldoRealApp: number;
}

export interface DailySnapshotRecord {
  locked: boolean;
  lockedAt?: any;
}

export async function getUsers(): Promise<UserRecord[]> {
  const q = query(getTenantCollection(db, "kasirs"));
  const snap = await getDocs(q);
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord));

  if (users.length === 0) {
    // Auto-create Owner dan Kasir 1 untuk akun baru
    const ownerData = { name: "Owner", role: "owner", pin: "1234", isActive: true };
    const kasirData = { name: "Kasir 1", role: "kasir", pin: "1234", isActive: true };
    const ownerRef = await addDoc(getTenantCollection(db, "kasirs"), ownerData);
    const kasirRef = await addDoc(getTenantCollection(db, "kasirs"), kasirData);
    return [
      { id: ownerRef.id, ...ownerData },
      { id: kasirRef.id, ...kasirData }
    ];
  }
  return users;
}

export async function createUser(data: Omit<UserRecord, "id">): Promise<string> {
  const ref = await addDoc(getTenantCollection(db, "kasirs"), data);
  return ref.id;
}

export async function updateUser(id: string, data: Partial<UserRecord>): Promise<void> {
  await updateDoc(doc(db, "kasirs", id), data as any);
}

export async function deleteUser(id: string): Promise<void> {
  await deleteDoc(doc(db, "kasirs", id));
}

export async function getSettings(): Promise<SettingsRecord> {
  const ref = doc(db, "settings", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const defaults: SettingsRecord = {
      shopName: "KASIR CUBE",
      logoUrl: "/logo.png",
      profilePhotoUrl: "/logo.png",
      autoLockHour: 1,
      autoLockMinute: 0,
      autoResetHour: 2,
      autoResetMinute: 0,
      autoUnlockHour: 8,
      autoUnlockMinute: 0,
      mutiaraQuotes: "",
      runningText: "",
      pinEnabled: false,
      categoryLabels: {
        BANK: { name: "BANK", visible: true },
        FLIP: { name: "FLIP", visible: true },
        APP: { name: "APP", visible: true },
        DANA: { name: "DANA", visible: true },
        AKS: { name: "AKS", visible: true },
        TARIK: { name: "TARIK", visible: true },
      },
      customCategories: [
        { id: "sea_bank", name: "Sea Bank", type: "bank", color: "text-foreground" },
        { id: "bri", name: "Bank BRI", type: "bank", color: "text-foreground" },
        { id: "app", name: "Aplikasi Pulsa", type: "bank", color: "text-foreground" },
        { id: "dana", name: "Dana", type: "bank", color: "text-foreground" },
        { id: "tarik", name: "Tarik Tunai", type: "tarik", color: "text-red-600" },
        { id: "aks", name: "Aksesoris", type: "aks", color: "text-orange-500" },
      ],
    };
    await setDoc(ref, defaults);
    return defaults;
  }
  return snap.data() as SettingsRecord;
}

export async function updateSettings(data: Partial<SettingsRecord>): Promise<void> {
  const ref = doc(db, "settings", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, data);
  } else {
    await updateDoc(ref, data as any);
  }
}

export async function getSystemConfig(): Promise<SystemConfigRecord> {
  const ref = doc(db, "system", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const defaults: SystemConfigRecord = {
      requireLicense: true,
      waNumber: "6287824889706",
      lockOwnerMode: false
    };
    await setDoc(ref, defaults);
    return defaults;
  }
  return snap.data() as SystemConfigRecord;
}

export async function updateSystemConfig(data: Partial<SystemConfigRecord>): Promise<void> {
  const ref = doc(db, "system", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, data);
  } else {
    await updateDoc(ref, data as any);
  }
}

export async function getTransactions(params: {
  kasirName?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TransactionRecord[]> {
  const col = getTenantCollection(db, "transactions");
  const q = query(col);
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRecord));

  if (params.kasirName) {
    results = results.filter(t => t.kasirName === params.kasirName);
  }
  if (params.startDate) {
    results = results.filter(t => t.transDate >= params.startDate!);
  }
  if (params.endDate) {
    results = results.filter(t => t.transDate <= params.endDate!);
  }
  results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return results;
}

export async function createTransaction(data: Omit<TransactionRecord, "id" | "createdAt" | "uid">): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(getTenantCollection(db, "transactions"), {
    ...data,
    uid,
    createdAt: new Date().toISOString(),
  });

  await updateBalance(data.kasirName, data);

  return ref.id;
}

export async function updateTransaction(id: string, data: Partial<TransactionRecord>): Promise<void> {
  const oldSnap = await getDoc(doc(db, "transactions", id));
  if (oldSnap.exists()) {
    const oldTx = oldSnap.data() as TransactionRecord;
    await reverseBalance(oldTx.kasirName, oldTx);
  }
  await updateDoc(doc(db, "transactions", id), data as any);
  const newSnap = await getDoc(doc(db, "transactions", id));
  if (newSnap.exists()) {
    const newTx = newSnap.data() as TransactionRecord;
    await updateBalance(newTx.kasirName, newTx);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const snap = await getDoc(doc(db, "transactions", id));
  if (snap.exists()) {
    const txData = snap.data() as TransactionRecord;
    await reverseBalance(txData.kasirName, txData);
  }
  await deleteDoc(doc(db, "transactions", id));
}

export async function updateBalance(kasirName: string, tx: Omit<TransactionRecord, "id" | "createdAt" | "uid">) {
  const ref = doc(db, "balances", kasirName);
  const snap = await getDoc(ref);
  const bal: BalanceRecord = snap.exists()
    ? (snap.data() as BalanceRecord)
    : { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 };

  const isNonTunai = tx.paymentMethod && tx.paymentMethod.toLowerCase().includes("non-tunai");
  const nominal = tx.nominal || 0;
  const admin = tx.admin || 0;

  const catType = tx.categoryType;

  if (tx.category === "NON TUNAI" || isNonTunai) {
    bal.bankNonTunai += nominal;
  } else if (catType === "bank" || ["BANK", "FLIP", "APP PULSA", "DANA"].includes(tx.category)) {
    bal.cash += nominal;
    bal.bank -= nominal;
  } else if (catType === "tarik" || tx.category === "TARIK TUNAI") {
    bal.tarik += nominal;
    bal.cash -= nominal;
  } else if (catType === "aks" || tx.category === "AKSESORIS") {
    bal.aks += nominal;
    bal.cash += nominal;
  }

  if (!(tx.category === "NON TUNAI" || isNonTunai)) {
    bal.adminTotal += admin;
  }

  if (snap.exists()) {
    await updateDoc(ref, bal as any);
  } else {
    await setDoc(ref, bal);
  }
}

async function reverseBalance(kasirName: string, tx: TransactionRecord) {
  const ref = doc(db, "balances", kasirName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const bal = snap.data() as BalanceRecord;

  const isNonTunai = tx.paymentMethod && tx.paymentMethod.toLowerCase().includes("non-tunai");
  const nominal = tx.nominal || 0;
  const admin = tx.admin || 0;

  const catType = tx.categoryType;

  if (tx.category === "NON TUNAI" || isNonTunai) {
    bal.bankNonTunai -= nominal;
  } else if (catType === "bank" || ["BANK", "FLIP", "APP PULSA", "DANA"].includes(tx.category)) {
    bal.cash -= nominal;
    bal.bank += nominal;
  } else if (catType === "tarik" || tx.category === "TARIK TUNAI") {
    bal.tarik -= nominal;
    bal.cash += nominal;
  } else if (catType === "aks" || tx.category === "AKSESORIS") {
    bal.aks -= nominal;
    bal.cash -= nominal;
  }

  if (!(tx.category === "NON TUNAI" || isNonTunai)) {
    bal.adminTotal -= admin;
  }

  await updateDoc(ref, bal as any);
}

export async function getBalance(kasirName: string): Promise<BalanceRecord> {
  const ref = doc(db, "balances", kasirName);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 };
  }
  return snap.data() as BalanceRecord;
}

export async function resetBalance(kasirName: string): Promise<void> {
  const ref = doc(db, "balances", kasirName);
  await setDoc(ref, { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 });
}

export async function getSaldoHistory(params: {
  kasirName?: string;
  startDate?: string;
  endDate?: string;
}): Promise<SaldoHistoryRecord[]> {
  const col = getTenantCollection(db, "saldo_history");
  const q = query(col);
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as SaldoHistoryRecord));

  if (params.kasirName) {
    results = results.filter(s => s.kasirName === params.kasirName);
  }
  if (params.startDate) {
    results = results.filter(s => s.saldoDate >= params.startDate!);
  }
  if (params.endDate) {
    results = results.filter(s => s.saldoDate <= params.endDate!);
  }
  results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return results;
}

export async function addSaldo(kasirName: string, data: {
  jenis: string;
  nominal: number;
  keterangan?: string;
}): Promise<string> {
  const now = new Date();
  const saldoDate = getWibDate();
  const saldoTime = now.toTimeString().substring(0, 5);

  const ref = await addDoc(getTenantCollection(db, "saldo_history"), {
    kasirName,
    jenis: data.jenis,
    nominal: data.nominal,
    keterangan: data.keterangan || `Tambah Saldo ${data.jenis}`,
    saldoDate,
    saldoTime,
    createdAt: new Date().toISOString(),
  });

  const balRef = doc(db, "balances", kasirName);
  const balSnap = await getDoc(balRef);
  const bal: BalanceRecord = balSnap.exists()
    ? (balSnap.data() as BalanceRecord)
    : { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 };

  if (data.jenis === "Bank") {
    bal.bank += data.nominal;
  } else if (data.jenis === "Cash") {
    bal.cash += data.nominal;
  }

  if (balSnap.exists()) {
    await updateDoc(balRef, bal as any);
  } else {
    await setDoc(balRef, bal);
  }

  return ref.id;
}

export async function addSaldoHistoryOnly(kasirName: string, data: {
  jenis: string;
  nominal: number;
  keterangan?: string;
}): Promise<string> {
  const now = new Date();
  const saldoDate = getWibDate();
  const saldoTime = now.toTimeString().substring(0, 5);

  const ref = await addDoc(getTenantCollection(db, "saldo_history"), {
    kasirName,
    jenis: data.jenis,
    nominal: data.nominal,
    keterangan: data.keterangan || `Tambah ${data.jenis}`,
    saldoDate,
    saldoTime,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getHutangList(userName?: string): Promise<HutangRecord[]> {
  const collName = "hutang";
  const q = query(getTenantCollection(db, collName));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as HutangRecord));
  results.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  return results;
}

export async function createHutang(data: Omit<HutangRecord, "id">, userName?: string): Promise<string> {
  const collName = "hutang";
  const ref = await addDoc(getTenantCollection(db, collName), data);
  return ref.id;
}

export async function updateHutang(id: string, data: Partial<HutangRecord>, userName?: string): Promise<void> {
  requireUid();
  const collName = "hutang";
  await updateDoc(doc(db, collName, id), data as any);
}

export async function deleteHutang(id: string, userName?: string): Promise<void> {
  requireUid();
  const collName = "hutang";
  await deleteDoc(doc(db, collName, id));
}

export async function getKontakList(userName?: string): Promise<KontakRecord[]> {
  const collName = "kontak";
  const q = query(getTenantCollection(db, collName));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as KontakRecord));
}

export async function createKontak(data: Omit<KontakRecord, "id">, userName?: string): Promise<string> {
  const collName = "kontak";
  const ref = await addDoc(getTenantCollection(db, collName), data);
  return ref.id;
}

export async function updateKontak(id: string, data: Partial<KontakRecord>, userName?: string): Promise<void> {
  requireUid();
  const collName = "kontak";
  await updateDoc(doc(db, collName, id), data as any);
}

export async function deleteKontak(id: string, userName?: string): Promise<void> {
  requireUid();
  const collName = "kontak";
  await deleteDoc(doc(getTenantCollection(db, collName), id));
}

export async function getAttendance(month: string, kasirName?: string): Promise<AttendanceRecord[]> {
  const col = getTenantCollection(db, "attendance");
  const q = query(col);
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));

  if (kasirName) {
    results = results.filter(a => a.kasirName === kasirName);
  }
  if (month) {
    results = results.filter(a => a.tanggal.startsWith(month));
  }
  results.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  return results;
}

export async function createAttendance(data: Omit<AttendanceRecord, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(getTenantCollection(db, "attendance"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getIzinList(params: { month?: string; nama?: string }): Promise<IzinRecord[]> {
  const col = getTenantCollection(db, "izin");
  const q = query(col);
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as IzinRecord));

  if (params?.month) {
    results = results.filter(i => i.tanggal.startsWith(params.month!));
  }
  if (params?.nama && params.nama !== "Semua") {
    results = results.filter(i => i.nama === params.nama);
  }
  results.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  return results;
}

export async function createIzin(data: Omit<IzinRecord, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(getTenantCollection(db, "izin"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateIzin(id: string, data: Partial<IzinRecord>): Promise<void> {
  await updateDoc(doc(db, "izin", id), data as any);
}

export async function getDailyNotes(kasirName: string, date: string): Promise<DailyNoteRecord> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_notes", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { sisaSaldoBank: 0, saldoRealApp: 0 };
  }
  return snap.data() as DailyNoteRecord;
}

export async function updateDailyNote(
  kasirName: string,
  date: string,
  field: "sisaSaldoBank" | "saldoRealApp",
  amount: number
): Promise<DailyNoteRecord> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_notes", docId);
  const snap = await getDoc(ref);
  const current: DailyNoteRecord = snap.exists()
    ? (snap.data() as DailyNoteRecord)
    : { sisaSaldoBank: 0, saldoRealApp: 0 };

  current[field] = (current[field] || 0) + amount;

  if (snap.exists()) {
    await updateDoc(ref, current as any);
  } else {
    await setDoc(ref, current);
  }
  return current;
}

export async function setDailyNote(
  kasirName: string,
  date: string,
  field: "sisaSaldoBank" | "saldoRealApp",
  value: number
): Promise<DailyNoteRecord> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_notes", docId);
  const snap = await getDoc(ref);
  const current: DailyNoteRecord = snap.exists()
    ? (snap.data() as DailyNoteRecord)
    : { sisaSaldoBank: 0, saldoRealApp: 0 };

  current[field] = value;

  if (snap.exists()) {
    await updateDoc(ref, current as any);
  } else {
    await setDoc(ref, current);
  }
  return current;
}

export async function getDailySnapshot(kasirName: string, date: string): Promise<DailySnapshotRecord | null> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_snapshots", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as DailySnapshotRecord;
}

export async function lockReport(kasirName: string, date: string): Promise<void> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_snapshots", docId);
  await setDoc(ref, { locked: true, lockedAt: new Date().toISOString() }, { merge: true });
}

export async function unlockReport(kasirName: string, date: string): Promise<void> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "daily_snapshots", docId);
  await setDoc(ref, { locked: false }, { merge: true });
}

export async function resetAllData(): Promise<void> {
  const colNames = ["transactions", "saldo_history", "balances", "hutang", "kontak",
                    "attendance", "izin", "daily_notes", "daily_snapshots", "kasirs"];
  for (const name of colNames) {
    const q = query(getTenantCollection(db, name));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  // Hapus settings per user
  try { await deleteDoc(doc(db, "settings", "main")); } catch { /* ignored */ }
}

export async function loginUser(name: string, pin?: string, shift?: string, deviceTime?: string): Promise<{
  success: boolean;
  user?: UserRecord;
  role?: string;
  absenTime?: string;
  message?: string;
}> {
  const users = await getUsers();
  const user = users.find(u => u.name === name && u.isActive);
  if (!user) return { success: false, message: "User tidak ditemukan" };

  const settings = await getSettings();
  if (settings.pinEnabled && user.role !== "owner") {
    if (!pin || pin !== user.pin) {
      return { success: false, message: "PIN salah" };
    }
  }

  if (user.role !== "owner" && shift) {
    const today = getWibDate();
    const now = new Date();
    const jamMasuk = deviceTime || now.toTimeString().substring(0, 5);

    const attQ = query(getTenantCollection(db, "attendance"),
      where("kasirName", "==", name),
      where("tanggal", "==", today)
    );
    const allAttendance = await getDocs(attQ);
    const alreadyExists = allAttendance.docs.some(d => d.data().shift === shift);
    if (!alreadyExists) {
      await createAttendance({
        kasirName: name,
        tanggal: today,
        shift,
        jamMasuk,
      });
    }
  }

  const absenTime = deviceTime || new Date().toTimeString().substring(0, 5);

  return {
    success: true,
    user,
    role: user.role,
    absenTime,
  };
}

export async function ownerAddSaldo(kasirName: string, date: string, data: { bank: number; cash: number; realApp: number; sisaSaldo: number }): Promise<void> {
  // Update balances collection (adds to existing)
  const balRef = doc(db, "balances", kasirName);
  const balSnap = await getDoc(balRef);
  const bal: BalanceRecord = balSnap.exists()
    ? (balSnap.data() as BalanceRecord)
    : { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 };
  
  bal.bank += data.bank;
  bal.cash += data.cash;
  
  if (balSnap.exists()) {
    await updateDoc(balRef, bal as any);
  } else {
    await setDoc(balRef, bal);
  }

  // Update daily_notes collection (adds to existing)
  const noteRef = doc(db, "daily_notes", `${date}_${kasirName}`);
  const noteSnap = await getDoc(noteRef);
  const noteData = noteSnap.exists() ? (noteSnap.data() as DailyNoteRecord) : null;
  const currentSisa = noteData ? (noteData.sisaSaldoBank || 0) : 0;
  const currentRealApp = noteData ? (noteData.saldoRealApp || 0) : 0;

  await setDoc(noteRef, { 
    date,
    kasirName,
    sisaSaldoBank: currentSisa + data.sisaSaldo,
    saldoRealApp: currentRealApp + data.realApp
  }, { merge: true });
}

// =======================
// LICENSE FUNCTIONS
// =======================

export async function getLicenses(): Promise<LicenseRecord[]> {
  const colRef = fbCollection(db, "licenses");
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LicenseRecord));
}

export async function generateLicense(type: "demo" | "4_months" | "lifetime", email: string): Promise<string> {
  const code = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
  const colRef = fbCollection(db, "licenses");
  const now = new Date();
  
  let expiresAt = null;
  if (type === "demo") {
    now.setDate(now.getDate() + 7);
    expiresAt = now.toISOString();
  } else if (type === "4_months") {
    now.setMonth(now.getMonth() + 4);
    expiresAt = now.toISOString();
  }

  await setDoc(fbDoc(colRef, code), {
    type,
    createdAt: new Date().toISOString(),
    expiresAt,
    maxDevices: 7,
    activeDevices: [],
    registeredEmail: email.toLowerCase(),
    status: "active"
  });

  return code;
}

export async function deleteLicense(code: string): Promise<void> {
  const docRef = doc(db, "licenses", code);
  await deleteDoc(docRef);
}

export async function validateLicense(code: string, email: string, deviceId: string): Promise<{ valid: boolean; message: string; license?: LicenseRecord }> {
  const docRef = doc(db, "licenses", code);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return { valid: false, message: "Kode lisensi tidak valid." };
  }
  
  const license = { id: snap.id, ...(snap.data() as any) } as LicenseRecord;
  
  if (license.status !== "active") {
    return { valid: false, message: "Lisensi ini sudah tidak aktif." };
  }
  
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { valid: false, message: "Lisensi ini sudah kedaluwarsa." };
  }
  
  const isDeviceRegistered = license.activeDevices.includes(deviceId);
  
  if (!isDeviceRegistered) {
    const currentMax = Math.max(license.maxDevices || 0, 7);
    if (license.activeDevices.length >= currentMax) {
      return { valid: false, message: `Batas maksimal ${currentMax} HP sudah tercapai.` };
    }
    
    // Check email matching if already registered
    if (license.registeredEmail && license.registeredEmail !== email) {
      return { valid: false, message: "Lisensi ini sudah terdaftar untuk email lain." };
    }

    const updatedDevices = [...license.activeDevices, deviceId];
    await updateDoc(docRef, { 
      activeDevices: updatedDevices,
      registeredEmail: license.registeredEmail || email
    });
    license.activeDevices = updatedDevices;
    license.registeredEmail = license.registeredEmail || email;
  } else {
    // Already registered device, but check email for safety
    if (license.registeredEmail && license.registeredEmail !== email) {
      return { valid: false, message: "Email tidak cocok dengan pendaftaran lisensi ini." };
    }
  }
  
  return { valid: true, message: "Lisensi valid.", license };
}

// ═══════════════════════════════════════════════════════════
// STOK VOUCHER
// ═══════════════════════════════════════════════════════════

export interface StokVoucherRecord {
  kasirName: string;
  date?: string;
  dataVoucher: Record<string, any>;
  dataQris: any[];
  updatedAt: string;
}

export async function getStokVoucher(kasirName: string, date: string): Promise<StokVoucherRecord | null> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "stok_voucher", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as StokVoucherRecord;
}

export async function syncStokVoucher(kasirName: string, date: string, dataVoucher: any, dataQris: any): Promise<void> {
  const docId = `${kasirName}_${date}`;
  const ref = doc(db, "stok_voucher", docId);
  await setDoc(ref, {
    kasirName,
    date,
    dataVoucher,
    dataQris,
    updatedAt: new Date().toISOString()
  });
}

export async function getStokVoucherByRange(kasirName: string | undefined, startDate: string, endDate: string): Promise<StokVoucherRecord[]> {
  const colRef = fbCollection(db, "stok_voucher");
  let q;
  if (kasirName) {
    q = query(colRef, where("kasirName", "==", kasirName), where("date", ">=", startDate), where("date", "<=", endDate));
  } else {
    q = query(colRef, where("date", ">=", startDate), where("date", "<=", endDate));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as StokVoucherRecord);
}

