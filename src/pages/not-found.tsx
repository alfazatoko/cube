import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex mb-4 gap-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">404</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">Halaman tidak ditemukan</p>
        <Link href="/" className="text-blue-600 font-bold text-sm">Kembali ke Login</Link>
      </div>
    </div>
  );
}
