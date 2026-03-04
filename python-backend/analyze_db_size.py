"""
分析数据库大小和各表数据量
"""
import sqlite3
from pathlib import Path

db_path = Path("data/neat-reader.db")

if not db_path.exists():
    print("❌ 数据库文件不存在")
    exit(1)

print(f"✅ 数据库文件: {db_path}")
print(f"📊 文件大小: {db_path.stat().st_size / 1024 / 1024:.2f} MB")
print()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 获取所有表名
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]

print(f"📋 数据库表 ({len(tables)} 个):")
print()

# 分析每个表
table_stats = []

for table in tables:
    # 获取行数
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    row_count = cursor.fetchone()[0]
    
    # 获取表的列信息
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    
    # 估算表大小（通过采样）
    if row_count > 0:
        cursor.execute(f"SELECT * FROM {table} LIMIT 1")
        sample_row = cursor.fetchone()
        
        # 估算单行大小
        row_size = 0
        if sample_row:
            for value in sample_row:
                if value is not None:
                    if isinstance(value, (str, bytes)):
                        row_size += len(str(value))
                    else:
                        row_size += 8  # 数字类型大约8字节
        
        estimated_size = row_size * row_count
    else:
        estimated_size = 0
    
    table_stats.append({
        'name': table,
        'rows': row_count,
        'columns': len(columns),
        'estimated_size': estimated_size
    })

# 按估算大小排序
table_stats.sort(key=lambda x: x['estimated_size'], reverse=True)

# 打印统计
print("表名".ljust(30), "行数".rjust(15), "列数".rjust(10), "估算大小".rjust(15))
print("-" * 75)

for stat in table_stats:
    size_str = f"{stat['estimated_size'] / 1024 / 1024:.2f} MB" if stat['estimated_size'] > 1024 * 1024 else f"{stat['estimated_size'] / 1024:.2f} KB"
    print(
        stat['name'].ljust(30),
        str(stat['rows']).rjust(15),
        str(stat['columns']).rjust(10),
        size_str.rjust(15)
    )

print()
print("=" * 75)

# 找出最大的表
if table_stats:
    largest = table_stats[0]
    print(f"\n🔍 最大的表: {largest['name']}")
    print(f"   - 行数: {largest['rows']:,}")
    print(f"   - 列数: {largest['columns']}")
    print(f"   - 估算大小: {largest['estimated_size'] / 1024 / 1024:.2f} MB")
    
    # 显示该表的结构
    cursor.execute(f"PRAGMA table_info({largest['name']})")
    columns = cursor.fetchall()
    print(f"\n   表结构:")
    for col in columns:
        print(f"     - {col[1]} ({col[2]})")
    
    # 显示前几行数据（只显示列名和数据类型）
    print(f"\n   数据样本:")
    cursor.execute(f"SELECT * FROM {largest['name']} LIMIT 3")
    rows = cursor.fetchall()
    
    for i, row in enumerate(rows, 1):
        print(f"     行 {i}:")
        for j, (col, value) in enumerate(zip(columns, row)):
            col_name = col[1]
            if value is None:
                value_str = "NULL"
            elif isinstance(value, (str, bytes)):
                value_len = len(str(value))
                if value_len > 100:
                    value_str = f"<{value_len} 字符>"
                else:
                    value_str = str(value)[:50]
            else:
                value_str = str(value)
            print(f"       {col_name}: {value_str}")

conn.close()

print("\n✅ 分析完成")
