import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  setDoc
} from "firebase/firestore/lite";
import { db } from "./firebase";
import { getWibDate } from "./utils";

export interface UserRecord {
  id: string;
  name: string;
  role: string;
  pin: string;
  isActive: boolean;
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
}

export interface TransactionRecord {
  id: string;
  kasirName: string;
  category: string;
  nominal: number;
  admin: number;
  keterangan: string;
  transDate: string;
  transTime: string;
  paymentMethod: string;
  nominalTunai?: number;
  adminTunai?: number;
  nominalNonTunai?: number;
  adminNonTunai?: number;
  createdAt: any;
}

export interface SaldoHistoryRecord {
  id: string;
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
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord));
}

export async function createUser(data: Omit<UserRecord, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "users"), data);
  return ref.id;
}

export async function updateUser(id: string, data: Partial<UserRecord>): Promise<void> {
  await updateDoc(doc(db, "users", id), data as any);
}

export async function deleteUser(id: string): Promise<void> {
  await deleteDoc(doc(db, "users", id));
}

export async function getSettings(): Promise<SettingsRecord> {
  const ref = doc(db, "settings", "main");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const defaults: SettingsRecord = {
      shopName: "ALFAZA LINK",
      logoUrl: "",
      profilePhotoUrl: "",
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

export async function getTransactions(params: {
  kasirName?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TransactionRecord[]> {
  const snap = await getDocs(collection(db, "transactions"));
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

export async function createTransaction(data: Omit<TransactionRecord, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "transactions"), {
    ...data,
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

async function updateBalance(kasirName: string, tx: Omit<TransactionRecord, "id" | "createdAt">) {
  const ref = doc(db, "balances", kasirName);
  const snap = await getDoc(ref);
  const bal: BalanceRecord = snap.exists()
    ? (snap.data() as BalanceRecord)
    : { bank: 0, cash: 0, tarik: 0, aks: 0, adminTotal: 0, bankNonTunai: 0, cashNonTunai: 0, tarikNonTunai: 0, aksNonTunai: 0 };

  const isNonTunai = tx.paymentMethod && tx.paymentMethod.toLowerCase().includes("non-tunai");
  const nominal = tx.nominal || 0;
  const admin = tx.admin || 0;

  if (tx.category === "NON TUNAI" || isNonTunai) {
    bal.bankNonTunai += nominal;
  } else if (["BANK", "FLIP", "APP PULSA", "DANA"].includes(tx.category)) {
    bal.cash += nominal;
    bal.bank -= nominal;
  } else if (tx.category === "TARIK TUNAI") {
    bal.tarik += nominal;
    bal.cash -= nominal;
  } else if (tx.category === "AKSESORIS") {
    bal.aks += nominal;
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

  if (tx.category === "NON TUNAI" || isNonTunai) {
    bal.bankNonTunai -= nominal;
  } else if (["BANK", "FLIP", "APP PULSA", "DANA"].includes(tx.category)) {
    bal.cash -= nominal;
    bal.bank += nominal;
  } else if (tx.category === "TARIK TUNAI") {
    bal.tarik -= nominal;
    bal.cash += nominal;
  } else if (tx.category === "AKSESORIS") {
    bal.aks -= nominal;
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
  const snap = await getDocs(collection(db, "saldo_history"));
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

  const ref = await addDoc(collection(db, "saldo_history"), {
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

  const ref = await addDoc(collection(db, "saldo_history"), {
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

export async function getHutangList(): Promise<HutangRecord[]> {
  const snap = await getDocs(collection(db, "hutang"));
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as HutangRecord));
  results.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  return results;
}

export async function createHutang(data: Omit<HutangRecord, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "hutang"), data);
  return ref.id;
}

export async function updateHutang(id: string, data: Partial<HutangRecord>): Promise<void> {
  await updateDoc(doc(db, "hutang", id), data as any);
}

export async function deleteHutang(id: string): Promise<void> {
  await deleteDoc(doc(db, "hutang", id));
}

export async function getKontakList(): Promise<KontakRecord[]> {
  const snap = await getDocs(collection(db, "kontak"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as KontakRecord));
}

export async function createKontak(data: Omit<KontakRecord, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "kontak"), data);
  return ref.id;
}

export async function updateKontak(id: string, data: Partial<KontakRecord>): Promise<void> {
  await updateDoc(doc(db, "kontak", id), data as any);
}

export async function deleteKontak(id: string): Promise<void> {
  await deleteDoc(doc(db, "kontak", id));
}

export async function getAttendance(params: {
  kasirName?: string;
  month?: string;
}): Promise<AttendanceRecord[]> {
  const snap = await getDocs(collection(db, "attendance"));
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));

  if (params.kasirName) {
    results = results.filter(a => a.kasirName === params.kasirName);
  }
  if (params.month) {
    results = results.filter(a => a.tanggal.startsWith(params.month!));
  }
  results.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  return results;
}

export async function createAttendance(data: Omit<AttendanceRecord, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "attendance"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getIzinList(params?: {
  month?: string;
  nama?: string;
}): Promise<IzinRecord[]> {
  const snap = await getDocs(collection(db, "izin"));
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
  const ref = await addDoc(collection(db, "izin"), {
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
  const colNames = ["transactions", "saldo_history", "balances", "hutang", "kontak", "attendance", "izin", "daily_notes", "daily_snapshots"];
  for (const col of colNames) {
    const snap = await getDocs(collection(db, col));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
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

    const allAttendance = await getDocs(collection(db, "attendance"));
    const alreadyExists = allAttendance.docs.some(d => {
      const data = d.data();
      return data.kasirName === name && data.tanggal === today && data.shift === shift;
    });
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
