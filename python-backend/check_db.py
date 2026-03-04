"""检查数据库状态"""
import sqlite3
from pathlib import Path

db_path = Path("data/neat-reader.db")

if not db_path.exists():
    print("❌ 数据库文件不存在")
    exit(1)

print(f"✅ 数据库文件存在: {db_path}")
print(f"📊 文件大小: {db_path.stat().st_size} 字节")
print()

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# 查看所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print(f"📋 数据库表 ({len(tables)} 个):")
for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"  - {table_name}: {count} 条记录")

conn.close()
print()
print("✅ 数据库检查完成！")
