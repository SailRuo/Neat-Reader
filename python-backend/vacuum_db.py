"""
清理数据库碎片
"""
import sqlite3
from pathlib import Path
import time

db_path = Path("data/neat-reader.db")

if not db_path.exists():
    print("❌ 数据库文件不存在")
    exit(1)

# 获取清理前的大小
before_size = db_path.stat().st_size
print(f"📊 清理前大小: {before_size / 1024 / 1024:.2f} MB")

print("🔧 正在执行 VACUUM...")
start_time = time.time()

conn = sqlite3.connect(db_path)
conn.execute("VACUUM")
conn.close()

elapsed = time.time() - start_time

# 获取清理后的大小
after_size = db_path.stat().st_size
saved = before_size - after_size

print(f"✅ VACUUM 完成 (耗时 {elapsed:.2f} 秒)")
print(f"📊 清理后大小: {after_size / 1024 / 1024:.2f} MB")
print(f"💾 节省空间: {saved / 1024 / 1024:.2f} MB ({saved / before_size * 100:.1f}%)")
