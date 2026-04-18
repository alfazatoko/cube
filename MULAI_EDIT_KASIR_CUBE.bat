@echo off
echo Membuka proyek KASIR CUBE di Antigravity...
start "" "C:\Users\Administrator\AppData\Local\Programs\Antigravity\Antigravity.exe" "c:\Users\Administrator\Desktop\ALFAZA CELL\cube"
echo Menjalankan server pengembangan (npm run dev)...
cd /d "c:\Users\Administrator\Desktop\ALFAZA CELL\cube"
npm run dev
pause
