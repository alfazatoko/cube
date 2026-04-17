import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import type { UserRecord } from "./firestore";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  firebaseLoading: boolean;
  user: UserRecord | null;
  shift: string | null;
  loginTime: string | null;
  absenTime: string | null;
  login: (user: UserRecord, shift: string, absenTime?: string) => void;
  logout: () => void;
  firebaseLogin: (email: string, password: string) => Promise<void>;
  firebaseRegister: (email: string, password: string) => Promise<void>;
  firebaseLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [shift, setShift] = useState<string | null>(null);
  const [loginTime, setLoginTime] = useState<string | null>(null);
  const [absenTime, setAbsenTime] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setFirebaseLoading(false);
      if (!fbUser) {
        setUser(null);
        setShift(null);
        setLoginTime(null);
        setAbsenTime(null);
        localStorage.removeItem("alfaza_user");
        localStorage.removeItem("alfaza_shift");
        localStorage.removeItem("alfaza_login_time");
        localStorage.removeItem("alfaza_absen_time");
      } else {
        const storedUser = localStorage.getItem("alfaza_user");
        const storedShift = localStorage.getItem("alfaza_shift");
        const storedLoginTime = localStorage.getItem("alfaza_login_time");
        const storedAbsenTime = localStorage.getItem("alfaza_absen_time");
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedShift) setShift(storedShift);
        if (storedLoginTime) setLoginTime(storedLoginTime);
        if (storedAbsenTime) setAbsenTime(storedAbsenTime);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = (newUser: UserRecord, newShift: string, serverAbsenTime?: string) => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");
    const timeStr = `${h}.${m}.${s}`;
    setUser(newUser);
    setShift(newShift);
    setLoginTime(timeStr);
    localStorage.setItem("alfaza_user", JSON.stringify(newUser));
    localStorage.setItem("alfaza_shift", newShift);
    localStorage.setItem("alfaza_login_time", timeStr);

    const absen = serverAbsenTime || timeStr;
    setAbsenTime(absen);
    localStorage.setItem("alfaza_absen_time", absen);
  };

  const logout = () => {
    setUser(null);
    setShift(null);
    setLoginTime(null);
    setAbsenTime(null);
    localStorage.removeItem("alfaza_user");
    localStorage.removeItem("alfaza_shift");
    localStorage.removeItem("alfaza_login_time");
    localStorage.removeItem("alfaza_absen_time");
  };

  const firebaseLogin = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const firebaseRegister = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const firebaseLogout = async () => {
    logout();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        firebaseLoading,
        user,
        shift,
        loginTime,
        absenTime,
        login,
        logout,
        firebaseLogin,
        firebaseRegister,
        firebaseLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
