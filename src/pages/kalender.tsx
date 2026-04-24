import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay } from "date-fns";
import { id } from "date-fns/locale";
import moment from "moment-hijri";
import { ChevronLeft, ChevronRight, Calendar, Moon, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Indonesian holidays 2025-2026 (can be expanded)
const INDONESIAN_HOLIDAYS: Record<string, string> = {
  "2025-01-01": "Tahun Baru Masehi",
  "2025-03-31": "Hari Raya Idul Fitri",
  "2025-04-01": "Hari Raya Idul Fitri",
  "2025-05-01": "Hari Buruh Internasional",
  "2025-06-01": "Hari Lahir Pancasila",
  "2025-06-07": "Hari Raya Waisak",
  "2025-06-08": "Hari Raya Waisak",
  "2025-08-17": "Hari Kemerdekaan RI",
  "2025-12-25": "Hari Raya Natal",
  "2026-01-01": "Tahun Baru Masehi",
  "2026-03-20": "Hari Raya Idul Fitri",
  "2026-03-21": "Hari Raya Idul Fitri",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-08-17": "Hari Kemerdekaan RI",
  "2026-12-25": "Hari Raya Natal",
};

const HOLIDAYS_2025 = [
  { date: "2025-01-01", name: "Tahun Baru Masehi", type: "national" },
  { date: "2025-03-31", name: "Hari Raya Idul Fitri", type: "religious" },
  { date: "2025-04-01", name: "Hari Raya Idul Fitri", type: "religious" },
  { date: "2025-05-01", name: "Hari Buruh Internasional", type: "national" },
  { date: "2025-06-01", name: "Hari Lahir Pancasila", type: "national" },
  { date: "2025-06-07", name: "Hari Raya Waisak", type: "religious" },
  { date: "2025-06-08", name: "Hari Raya Waisak", type: "religious" },
  { date: "2025-08-17", name: "Hari Kemerdekaan RI", type: "national" },
  { date: "2025-12-25", name: "Hari Raya Natal", type: "religious" },
];

const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Tahun Baru Masehi", type: "national" },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri", type: "religious" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri", type: "religious" },
  { date: "2026-05-01", name: "Hari Buruh Internasional", type: "national" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", type: "national" },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI", type: "national" },
  { date: "2026-12-25", name: "Hari Raya Natal", type: "religious" },
];

export default function Kalender() {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - getDay(monthStart));
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - getDay(monthEnd)));

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getHijriDate = (date: Date) => {
    try {
      const m = moment(date);
      const hijriDay = m.iDate();
      const hijriMonth = m.iMonth();
      const hijriYear = m.iYear();
      
      const monthNames = [
        "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
        "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
        "Ramadhan", "Syawal", "Zulqaidah", "Zulhijjah"
      ];
      
      return {
        day: hijriDay,
        month: hijriMonth + 1,
        year: hijriYear,
        monthName: monthNames[hijriMonth % 12]
      };
    } catch {
      return null;
    }
  };

  const getHoliday = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const year = date.getFullYear();
    const holidays = year === 2025 ? HOLIDAYS_2025 : year === 2026 ? HOLIDAYS_2026 : [];
    return holidays.find(h => h.date === dateStr);
  };

  const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const selectedHijri = getHijriDate(selectedDate);
  const selectedHoliday = getHoliday(selectedDate);

  return (
    <div className="px-3 pt-3 pb-24 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-blue-500 rounded-3xl text-white p-4 mb-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setLocation("/beranda")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black tracking-tight">KALENDER</h1>
          <div className="w-9" />
        </div>

        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-extrabold">
              {format(currentDate, "MMMM yyyy", { locale: id })}
            </h2>
            <p className="text-sm text-blue-200 mt-0.5">
              {selectedHijri && `${selectedHijri.monthName} ${selectedHijri.year} H`}
            </p>
          </div>
          <button onClick={goToNextMonth} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <button
        onClick={goToToday}
        className="w-full bg-white border-2 border-blue-500 text-blue-600 py-2 rounded-xl font-bold text-sm mb-4 shadow-sm hover:bg-blue-50 transition"
      >
        Kembali ke Hari Ini
      </button>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
        <div className="grid grid-cols-7 bg-blue-600 text-white">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-bold">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hijri = getHijriDate(day);
            const holiday = getHoliday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "min-h-[70px] p-1 border border-gray-100 flex flex-col items-center justify-center transition hover:bg-blue-50",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                  isTodayDate && !isSelected && "bg-blue-100",
                  holiday && !isSelected && "bg-red-50"
                )}
              >
                <span className={cn(
                  "text-sm font-bold",
                  isSelected && "text-white",
                  isTodayDate && !isSelected && "text-blue-600"
                )}>
                  {format(day, "d")}
                </span>
                {hijri && (
                  <span className={cn(
                    "text-[9px] mt-0.5",
                    isSelected ? "text-blue-200" : "text-gray-500"
                  )}>
                    {hijri.day}
                  </span>
                )}
                {holiday && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    isSelected ? "bg-yellow-300" : "bg-red-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-800">Detail Tanggal</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Tanggal Masehi</span>
            <span className="font-bold text-gray-800">
              {format(selectedDate, "EEEE, d MMMM yyyy", { locale: id })}
            </span>
          </div>
          
          {selectedHijri && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-600">Tanggal Hijriyah</span>
              </div>
              <span className="font-bold text-gray-800">
                {selectedHijri.day} {selectedHijri.monthName} {selectedHijri.year} H
              </span>
            </div>
          )}
          
          {selectedHoliday && (
            <div className="flex justify-between items-center py-2 bg-red-50 rounded-lg px-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-600">Hari Libur</span>
              </div>
              <span className="font-bold text-red-600">{selectedHoliday.name}</span>
            </div>
          )}
          
          {!selectedHoliday && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Status</span>
              <span className="font-bold text-green-600">Hari Kerja</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">Keterangan</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Hari Libur Nasional/Agama</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="text-gray-600">Tanggal Terpilih</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-100" />
            <span className="text-gray-600">Hari Ini</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-100" />
            <span className="text-gray-600">Tanggal di luar bulan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
