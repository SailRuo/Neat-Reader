"""
检查数据库膨胀和碎片
"""
import sqlite3
from pathlib import Path

db_path = Path("data/neat-reader.db")

if not db_path.exists():
    print("❌ 数据库文件不存在")
    exit(1)

print(f"✅ 数据库文件: {db_path}")
file_size = db_path.stat().st_size
print(f"📊 实际文件大小: {file_size / 1024 / 1024:.2f} MB ({file_size:,} 字节)")
print()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 获取页面统计
cursor.execute("PRAGMA page_count")
page_count = cursor.fetchone()[0]

cursor.execute("PRAGMA page_size")
page_size = cursor.fetchone()[0]

cursor.execute("PRAGMA freelist_count")
freelist_count = cursor.fetchone()[0]

print(f"📄 页面统计:")
print(f"   - 总页数: {page_count:,}")
print(f"   - 页面大小: {page_size:,} 字节")
print(f"   - 空闲页数: {freelist_count:,}")
print(f"   - 理论大小: {page_count * page_size / 1024 / 1024:.2f} MB")
print(f"   - 空闲空间: {freelist_count * page_size / 1024 / 1024:.2f} MB ({freelist_count * page_size / file_size * 100:.1f}%)")
print()

# 检查是否需要 VACUUM
if freelist_count > page_count * 0.1:
    print("⚠️  数据库有大量碎片，建议执行 VACUUM 清理")
    print()

# 获取所有表的实际数据大小
print("📊 各表实际占用空间:")
print()

cursor.execute("""
    SELECT 
        name,
        SUM(pgsize) as size
    FROM dbstat
    WHERE name NOT LIKE 'sqlite_%'
    GROUP BY name
    ORDER BY size DESC
""")

table_sizes = cursor.fetchall()

print("表名".ljust(30), "实际大小".rjust(15))
print("-" * 50)

for table_name, size in table_sizes:
    if size > 1024 * 1024:
        size_str = f"{size / 1024 / 1024:.2f} MB"
    elif size > 1024:
        size_str = f"{size / 1024:.2f} KB"
    else:
        size_str = f"{size} B"
    
    print(table_name.ljust(30), size_str.rjust(15))

print()

# 计算总数据大小
total_data_size = sum(size for _, size in table_sizes)
print(f"总数据大小: {total_data_size / 1024 / 1024:.2f} MB")
print(f"文件大小: {file_size / 1024 / 1024:.2f} MB")
print(f"空间利用率: {total_data_size / file_size * 100:.1f}%")
print()

# 建议
if freelist_count > 0:
    print("💡 优化建议:")
    print("   执行 VACUUM 可以回收空闲空间并优化数据库")
    print("   命令: sqlite3 data/neat-reader.db 'VACUUM;'")
    print()
    
    # 估算 VACUUM 后的大小
    estimated_size = (page_count - freelist_count) * page_size
    print(f"   预计优化后大小: {estimated_size / 1024 / 1024:.2f} MB")
    print(f"   可节省空间: {(file_size - estimated_size) / 1024 / 1024:.2f} MB")

conn.close()

print("\n✅ 检查完成")
