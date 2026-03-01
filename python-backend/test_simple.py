"""
简单测试脚本
假设前端已经授权，直接测试 Python 后端功能
"""
import requests
import sys

API_BASE = "http://127.0.0.1:3002/api"

def main():
    print("=" * 60)
    print("Python Backend 简单测试")
    print("=" * 60)
    
    # 1. 测试健康检查
    print("\n1. 测试健康检查...")
    try:
        response = requests.get(f"{API_BASE}/health")
        response.raise_for_status()
        data = response.json()
        print(f"   ✅ 健康检查成功: {data['status']}")
    except Exception as e:
        print(f"   ❌ 健康检查失败: {e}")
        print("\n请先启动 Python 后端:")
        print("   cd python-backend")
        print("   python main.py")
        sys.exit(1)
    
    # 2. 说明如何获取 token
    print("\n2. Qwen API 测试需要 access_token")
    print("\n   方式 1: 从前端获取（推荐）")
    print("   ----------------------------------------")
    print("   1) 打开 Neat Reader 前端")
    print("   2) 完成 Qwen AI 授权")
    print("   3) 打开浏览器开发者工具（F12）")
    print("   4) Console 中运行:")
    print("      localStorage.getItem('qwen_access_token')")
    print("   5) 复制 token，运行:")
    print("      python test_qwen_api.py <token> <resource_url>")
    
    print("\n   方式 2: 使用交互式脚本")
    print("   ----------------------------------------")
    print("   python test_qwen_from_frontend.py")
    print("   （会引导你从前端复制 token）")
    
    print("\n" + "=" * 60)
    print("✅ Python 后端运行正常！")
    print("=" * 60)
    print("\n下一步:")
    print("1. 在前端完成 Qwen AI 授权")
    print("2. 运行 test_qwen_from_frontend.py 测试 API 集成")
    print("3. 开始开发 PageIndex 功能")

if __name__ == "__main__":
    main()
