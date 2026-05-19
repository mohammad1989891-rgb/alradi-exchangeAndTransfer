#!/bin/bash
# 🔸 Persistent Dev Server Starter
# يبدأ خادم Next.js ويبقى يعمل في الخلفية

cd /home/z/my-project

# قتل أي عملية سابقة
pkill -f "next dev -p 3000" 2>/dev/null || true
sleep 2

# تنظيف كاش Next.js
rm -rf .next 2>/dev/null || true

# بدء الخادم
npx next dev -p 3000 >> dev.log 2>&1 &
DEV_PID=$!
echo "[$(date)] Next.js dev server started with PID: $DEV_PID" >> dev.log

# انتظار حتى يبدأ الخادم
for i in $(seq 1 30); do
  sleep 1
  if curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "[$(date)] ✅ Server is ready!" >> dev.log
    break
  fi
done

# 🔸 الحلقة الرئيسية - إبقاء العملية حية وإعادة التشغيل عند الحاجة
while true; do
  # فحص كل 10 ثواني
  sleep 10
  
  # التحقق من أن العملية لا تزال حية
  if ! kill -0 $DEV_PID 2>/dev/null; then
    echo "[$(date)] ⚠️ Server process died, restarting..." >> dev.log
    pkill -f "next dev -p 3000" 2>/dev/null || true
    sleep 2
    npx next dev -p 3000 >> dev.log 2>&1 &
    DEV_PID=$!
    echo "[$(date)] Restarted with PID: $DEV_PID" >> dev.log
    
    # انتظار حتى يبدأ
    for i in $(seq 1 30); do
      sleep 1
      if curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
        echo "[$(date)] ✅ Server is back up!" >> dev.log
        break
      fi
    done
  fi
  
  # فحص HTTP أيضاً
  if ! curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "[$(date)] ⚠️ Server not responding to HTTP, checking process..." >> dev.log
    if ! kill -0 $DEV_PID 2>/dev/null; then
      echo "[$(date)] Process is dead, will restart on next check" >> dev.log
    else
      echo "[$(date)] Process alive but not responding - might be compiling" >> dev.log
    fi
  fi
done
