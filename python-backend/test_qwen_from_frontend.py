"""
从前端 localStorage 获取 token 并测试 Qwen API
自动读取 Neat Reader 前端存储的 token
"""
import requests
import json
import sys

# API 基础 URL
API_BASE = "http://127.0.0.1:3002/api"

def get_token_from_frontend():
    """
    从前端 localStorage 获取 token
    
    说明：
    1. 打开 Neat Reader 前端（http://localhost:5173）
    2. 打开浏览器开发者工具（F12）
    3. 进入 Console 标签
    4. 运行以下命令获取 token：
    
    ```javascript
    console.log(JSON.stringify({
        access_token: localStorage.getItem('qwen_access_token'),
        resource_url: localStorage.getItem('qwen_resource_url')
    }, null, 2))
    ```
    
    5. 复制输出的 JSON，粘贴到这里
    """
    print("=" * 60)
    print("从前端获取 Qwen Token")
    print("=" * 60)
    print("\n请按照以下步骤操作：")
    print("\n1. 打开 Neat Reader 前端（http://localhost:5173）")
    print("2. 确保已在设置中完成 Qwen AI 授权")
    print("3. 打开浏览器开发者工具（F12）")
    print("4. 进入 Console 标签")
    print("5. 运行以下命令：\n")
    print("   console.log(JSON.stringify({")
    print("       access_token: localStorage.getItem('qwen_access_token'),")
    print("       resource_url: localStorage.getItem('qwen_resource_url')")
    print("   }, null, 2))")
    print("\n6. 复制输出的 JSON，粘贴到下面（输入完成后按 Ctrl+D 或 Ctrl+Z）：\n")
    
    # 读取多行输入
    lines = []
    try:
        while True:
            line = input()
            lines.append(line)
    except EOFError:
        pass
    
    json_str = '\n'.join(lines)
    
    try:
        data = json.loads(json_str)
        access_token = data.get('access_token')
        resource_url = data.get('resource_url')
        
        if not access_token:
            print("\n❌ 错误: 未找到 access_token")
            print("   请确保已在前端完成 Qwen AI 授权")
            return None, None
        
        print(f"\n✅ 成功获取 token")
        print(f"   Access Token: {access_token[:20]}...")
        print(f"   Resource URL: {resource_url or 'default'}")
        
        return access_token, resource_url
    except json.JSONDecodeError as e:
        print(f"\n❌ JSON 解析失败: {e}")
        print("   请确保粘贴的是有效的 JSON 格式")
        return None, None

def test_qwen_api(access_token: str, resource_url: str = None):
    """测试 Qwen API"""
    print("\n" + "=" * 60)
    print("测试 Qwen API 连接")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{API_BASE}/qwen/test",
            json={
                "access_token": access_token,
                "resource_url": resource_url,
                "message": "你好，请用一句话介绍你自己。"
            }
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"\n✅ Qwen API 连接成功！")
        print(f"\n响应内容：")
        print(f"   {data['response']}")
        print(f"\nToken 使用：")
        print(f"   输入: {data['usage']['prompt_tokens']} tokens")
        print(f"   输出: {data['usage']['completion_tokens']} tokens")
        print(f"   总计: {data['usage']['total_tokens']} tokens")
        
        return True
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ Qwen API 连接失败: HTTP {e.response.status_code}")
        error_detail = e.response.json().get('detail', '未知错误')
        print(f"   错误: {error_detail}")
        
        if e.response.status_code == 401:
            print("\n💡 提示: Token 可能已过期，请在前端重新授权")
        
        return False
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        return False

def main():
    """主流程"""
    print("\n" + "=" * 60)
    print("Python Backend - Qwen API 集成测试")
    print("（自动从前端获取 Token）")
    print("=" * 60)
    
    # 检查后端是否运行
    try:
        response = requests.get(f"{API_BASE}/health", timeout=2)
        response.raise_for_status()
        print("\n✅ Python 后端运行正常")
    except Exception as e:
        print(f"\n❌ 错误: Python 后端未运行")
        print(f"   请先启动后端: python main.py")
        print(f"   详情: {e}")
        sys.exit(1)
    
    # 从前端获取 token
    access_token, resource_url = get_token_from_frontend()
    
    if not access_token:
        sys.exit(1)
    
    # 测试 API
    success = test_qwen_api(access_token, resource_url)
    
    if success:
        print("\n" + "=" * 60)
        print("🎉 测试成功！")
        print("=" * 60)
        print("\nPython 后端已成功集成 Qwen API！")
        print("现在可以继续开发 PageIndex 功能了。")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("⚠️  测试失败")
        print("=" * 60)
        print("\n请检查：")
        print("1. 前端是否已完成 Qwen AI 授权")
        print("2. Token 是否已过期（在前端重新授权）")
        print("3. 网络连接是否正常")
        sys.exit(1)

if __name__ == "__main__":
    main()
