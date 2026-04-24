import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay } from "date-fns";
import { id } from "date-fns/locale";
import moment from "moment-hijri";
import { ChevronLeft, ChevronRight, Calendar, Moon, Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Javanese calendar days (Weton)
const JAVANESE_DAYS = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];

// Indonesian holidays 2025-2026 (Complete)
const HOLIDAYS: Record<string, { name: string; type: string; color: string }> = {
  // 2025
  "2025-01-01": { name: "Tahun Baru Masehi", type: "national", color: "red" },
  "2025-01-28": { name: "Isra Mi'raj Nabi Muhammad SAW", type: "religious", color: "orange" },
  "2025-03-31": { name: "Hari Raya Idul Fitri", type: "religious", color: "red" },
  "2025-04-01": { name: "Hari Raya Idul Fitri", type: "religious", color: "red" },
  "2025-05-01": { name: "Hari Buruh Internasional", type: "national", color: "red" },
  "2025-06-01": { name: "Hari Lahir Pancasila", type: "national", color: "red" },
  "2025-06-06": { name: "Hari Raya Waisak", type: "religious", color: "red" },
  "2025-06-07": { name: "Hari Raya Idul Adha", type: "religious", color: "red" },
  "2025-06-17": { name: "Tahun Baru Islam 1447 H", type: "religious", color: "orange" },
  "2025-08-17": { name: "Hari Kemerdekaan RI", type: "national", color: "red" },
  "2025-09-04": { name: "Maulid Nabi Muhammad SAW", type: "religious", color: "orange" },
  "2025-12-25": { name: "Hari Raya Natal", type: "religious", color: "red" },
  
  // 2026
  "2026-01-01": { name: "Tahun Baru Masehi", type: "national", color: "red" },
  "2026-02-17": { name: "Isra Mi'raj Nabi Muhammad SAW", type: "religious", color: "orange" },
  "2026-03-20": { name: "Hari Raya Idul Fitri", type: "religious", color: "red" },
  "2026-03-21": { name: "Hari Raya Idul Fitri", type: "religious", color: "red" },
  "2026-05-01": { name: "Hari Buruh Internasional", type: "national", color: "red" },
  "2026-06-01": { name: "Hari Lahir Pancasila", type: "national", color: "red" },
  "2026-06-26": { name: "Hari Raya Waisak", type: "religious", color: "red" },
  "2026-06-27": { name: "Hari Raya Idul Adha", type: "religious", color: "red" },
  "2026-08-17": { name: "Hari Kemerdekaan RI", type: "national", color: "red" },
  "2026-08-24": { name: "Tahun Baru Islam 1448 H", type: "religious", color: "orange" },
  "2026-12-25": { name: "Hari Raya Natal", type: "religious", color: "red" },
};

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

  const getJavaneseDay = (date: Date) => {
    // Calculate Javanese day based on a reference date
    const refDate = new Date("2000-01-01"); // Saturday, Legi
    const diffTime = date.getTime() - refDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const index = ((diffDays % 5) + 5) % 5;
    return JAVANESE_DAYS[index];
  };

  const getHoliday = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return HOLIDAYS[dateStr];
  };

  const weekDays = [
    { short: "Ahad", color: "bg-red-600", textColor: "text-white" },
    { short: "Sen", color: "bg-yellow-400", textColor: "text-black" },
    { short: "Sel", color: "bg-yellow-400", textColor: "text-black" },
    { short: "Rab", color: "bg-yellow-400", textColor: "text-black" },
    { short: "Kam", color: "bg-yellow-400", textColor: "text-black" },
    { short: "Jum", color: "bg-emerald-500", textColor: "text-white" },
    { short: "Sab", color: "bg-yellow-400", textColor: "text-black" },
  ];

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const selectedHijri = getHijriDate(selectedDate);
  const selectedHoliday = getHoliday(selectedDate);

  // Get Hijri month range for header
  const firstDayHijri = getHijriDate(days[0]);
  const lastDayHijri = getHijriDate(days[days.length - 1]);
  
  const hijriHeader = useMemo(() => {
    if (!firstDayHijri || !lastDayHijri) return "";
    if (firstDayHijri.monthName === lastDayHijri.monthName) {
      return `${firstDayHijri.monthName} ${firstDayHijri.year} H`;
    }
    return `${firstDayHijri.monthName} - ${lastDayHijri.monthName} ${firstDayHijri.year} H`;
  }, [firstDayHijri, lastDayHijri]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setLocation("/beranda")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Kembali</span>
          </button>
          <h1 className="text-lg font-black tracking-tight">KALENDER INDONESIA</h1>
          <div className="w-20" />
        </div>
        
        {/* Month Navigation */}
        <div className="px-4 pb-4">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={goToPreviousMonth}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-black uppercase tracking-wide">
                  {format(currentDate, "MMMM yyyy", { locale: id })}
                </h2>
                <p className="text-sm text-emerald-100 mt-0.5 font-medium">
                  {hijriHeader}
                </p>
              </div>
              <button 
                onClick={goToNextMonth}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={goToToday}
              className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-xl text-sm font-bold transition"
            >
              Hari Ini
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-3 mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          {/* Week Headers */}
          <div className="grid grid-cols-7">
            {weekDays.map((day, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "py-2 text-center text-xs font-bold border-b border-r border-gray-100 last:border-r-0",
                  day.color,
                  day.textColor
                )}
              >
                {day.short}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayOfWeek = getDay(day);
              const hijri = getHijriDate(day);
              const javanese = getJavaneseDay(day);
              const holiday = getHoliday(day);
              const isFriday = dayOfWeek === 5;
              const isSunday = dayOfWeek === 0;
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[80px] p-1 border-b border-r border-gray-100 flex flex-col items-center justify-start pt-1 transition relative",
                    !isCurrentMonth && "bg-gray-50 text-gray-400",
                    isSelected && "bg-blue-100",
                    holiday && !isSelected && holiday?.color === "red" && "bg-red-50",
                    holiday && !isSelected && holiday?.color === "orange" && "bg-orange-50",
                    !isSelected && !holiday && isFriday && "bg-emerald-50",
                    (idx + 1) % 7 === 0 && "border-r-0"
                  )}
                >
                  {/* Gregorian Date */}
                  <span className={cn(
                    "text-lg font-bold leading-none",
                    isSelected && "text-blue-600",
                    !isSelected && holiday && holiday?.color === "red" && "text-red-600",
                    !isSelected && holiday && holiday?.color === "orange" && "text-orange-600",
                    !isSelected && !holiday && isSunday && "text-red-500",
                    !isSelected && !holiday && isFriday && "text-emerald-600",
                    !isSelected && !holiday && !isSunday && !isFriday && "text-gray-800",
                    !isCurrentMonth && "text-gray-400"
                  )}>
                    {format(day, "d")}
                  </span>
                  
                  {/* Hijri Date */}
                  {hijri && (
                    <span className={cn(
                      "text-[10px] mt-0.5 font-medium",
                      isSelected ? "text-blue-500" : "text-gray-500",
                      !isCurrentMonth && "text-gray-400"
                    )}>
                      {hijri.day}
                    </span>
                  )}
                  
                  {/* Javanese Day */}
                  <span className={cn(
                    "text-[8px] mt-0.5 font-medium uppercase",
                    isSelected ? "text-blue-400" : "text-gray-400"
                  )}>
                    {javanese}
                  </span>
                  
                  {/* Holiday Indicator */}
                  {holiday && (
                    <div className={cn(
                      "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                      holiday?.color === "red" && "bg-red-500",
                      holiday?.color === "orange" && "bg-orange-500"
                    )} />
                  )}
                  
                  {/* Today Indicator */}
                  {isTodayDate && !isSelected && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Detail */}
      <div className="px-3 mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-800">Detail Tanggal</h3>
          </div>
          
          <div className="space-y-3">
            {/* Masehi Date */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Masehi</span>
              <span className="font-bold text-gray-800 text-right">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: id })}
              </span>
            </div>
            
            {/* Hijri Date */}
            {selectedHijri && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-gray-600">Hijriyah</span>
                </div>
                <span className="font-bold text-emerald-700">
                  {selectedHijri.day} {selectedHijri.monthName} {selectedHijri.year} H
                </span>
              </div>
            )}
            
            {/* Javanese Date */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Weton</span>
              <span className="font-bold text-amber-700">
                {getJavaneseDay(selectedDate)}
              </span>
            </div>
            
            {/* Holiday */}
            {selectedHoliday && (
              <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700">{selectedHoliday.name}</span>
                </div>
                <span className="text-xs text-red-500 ml-6">
                  {selectedHoliday.type === "national" ? "Libur Nasional" : "Libur Keagamaan"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3">Keterangan</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-600" />
              <span className="text-gray-600">Ahad (Minggu)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-gray-600">Jumat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <span className="text-gray-600">Libur Nasional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-50 border border-orange-200" />
              <span className="text-gray-600">Libur Agama</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
              <span className="text-gray-600">Terpilih</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
