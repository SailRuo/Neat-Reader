"""
Qwen API 集成测试脚本
用于验证 Python 后端调用 Qwen API 的可行性
"""
import requests
import json
import sys
from typing import Optional

# API 基础 URL
API_BASE = "http://127.0.0.1:3002/api"

def test_health():
    """测试健康检查"""
    print("=" * 60)
    print("测试 1: 健康检查")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/health")
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ 健康检查成功")
        print(f"   状态: {data['status']}")
        print(f"   服务: {data['service']}")
        print(f"   版本: {data['version']}")
        return True
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False

def test_qwen_connection(access_token: str, resource_url: Optional[str] = None):
    """测试 Qwen API 连接（用户故事 8.3）"""
    print("\n" + "=" * 60)
    print("测试 2: Qwen API 连接测试（非流式）")
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
        print(f"✅ Qwen API 连接成功")
        print(f"   响应: {data['response'][:100]}...")
        print(f"   Token 使用: {data['usage']}")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"❌ Qwen API 连接失败: HTTP {e.response.status_code}")
        print(f"   错误: {e.response.json()}")
        return False
    except Exception as e:
        print(f"❌ Qwen API 连接失败: {e}")
        return False

def test_qwen_chat(access_token: str, resource_url: Optional[str] = None):
    """测试 Qwen 对话"""
    print("\n" + "=" * 60)
    print("测试 3: Qwen 对话（非流式）")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{API_BASE}/qwen/chat",
            json={
                "access_token": access_token,
                "resource_url": resource_url,
                "messages": [
                    {"role": "user", "content": "请用一句话解释什么是 PageIndex？"}
                ],
                "model": "qwen3-coder-plus"
            }
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ Qwen 对话成功")
        print(f"   响应: {data['response'][:200]}...")
        return True
    except Exception as e:
        print(f"❌ Qwen 对话失败: {e}")
        return False

def test_qwen_stream(access_token: str, resource_url: Optional[str] = None):
    """测试 Qwen 流式响应（用户故事 8.4）"""
    print("\n" + "=" * 60)
    print("测试 4: Qwen 流式响应（SSE）")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{API_BASE}/qwen/chat-stream",
            json={
                "access_token": access_token,
                "resource_url": resource_url,
                "messages": [
                    {"role": "user", "content": "请用三句话介绍 RAG 技术。"}
                ]
            },
            stream=True
        )
        response.raise_for_status()
        
        print("✅ 开始接收流式响应:")
        print("   ", end="", flush=True)
        
        full_response = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data_str = line[6:]
                    if data_str == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'content' in data:
                            content = data['content']
                            print(content, end="", flush=True)
                            full_response += content
                    except json.JSONDecodeError:
                        pass
        
        print("\n")
        print(f"✅ 流式响应完成，共 {len(full_response)} 字符")
        return True
    except Exception as e:
        print(f"\n❌ 流式响应失败: {e}")
        return False

def test_long_context(access_token: str, resource_url: Optional[str] = None):
    """测试长文本输入（用户故事 8.7）"""
    print("\n" + "=" * 60)
    print("测试 5: 长文本输入测试")
    print("=" * 60)
    
    # 构造长文本（模拟 PageIndex 上下文）
    long_context = """
    第一章：引言
    
    本章介绍了 PageIndex 框架的核心理念和设计思想。PageIndex 是一个创新的 RAG 方案，
    与传统向量检索完全不同。它不依赖语义相似度，而是基于推理和文档结构进行检索。
    
    1.1 背景
    
    传统的 RAG 系统依赖向量数据库和语义相似度搜索。然而，相似度并不等于相关性。
    在处理专业文档时，我们需要的是真正的相关性，而这需要推理能力。
    
    1.2 核心理念
    
    PageIndex 模拟人类专家导航文档的方式。当人类阅读一本书时，他们不会计算向量相似度，
    而是通过理解文档结构、章节标题和内容摘要来定位信息。PageIndex 正是基于这一理念设计的。
    
    1.3 技术优势
    
    - 无需向量数据库：只需 JSON 存储树结构
    - 无需文本分块：保留文档自然章节结构
    - 高准确率：在 FinanceBench 达到 98.7%
    - 可解释性：可追溯推理路径和章节引用
    """ * 3  # 重复 3 次，增加长度
    
    try:
        response = requests.post(
            f"{API_BASE}/qwen/test-long-context",
            json={
                "access_token": access_token,
                "resource_url": resource_url,
                "messages": [
                    {"role": "user", "content": f"以下是一本书的部分内容：\n\n{long_context}\n\n请总结这本书的核心理念。"}
                ],
                "model": "qwen3-coder-plus"
            }
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ 长文本测试成功")
        print(f"   输入统计:")
        print(f"     - 字符数: {data['input_stats']['total_chars']}")
        print(f"     - 估算 tokens: {data['input_stats']['estimated_tokens']}")
        print(f"     - 消息数: {data['input_stats']['message_count']}")
        print(f"   响应: {data['response'][:200]}...")
        return True
    except Exception as e:
        print(f"❌ 长文本测试失败: {e}")
        return False

def test_error_handling(access_token: str):
    """测试错误处理（用户故事 8.5）"""
    print("\n" + "=" * 60)
    print("测试 6: 错误处理（无效 Token）")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{API_BASE}/qwen/test",
            json={
                "access_token": "invalid_token_12345",
                "message": "测试"
            }
        )
        
        if response.status_code == 401:
            print(f"✅ 错误处理正确: HTTP 401")
            print(f"   错误信息: {response.json()['detail']}")
            return True
        else:
            print(f"⚠️  预期 401，实际 {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 错误处理测试失败: {e}")
        return False

def main():
    """主测试流程"""
    print("\n" + "=" * 60)
    print("Python Backend - Qwen API 集成测试")
    print("=" * 60)
    
    # 从命令行参数获取 access_token
    if len(sys.argv) < 2:
        print("\n❌ 错误: 缺少 access_token 参数")
        print("\n使用方法:")
        print("  python test_qwen_api.py <access_token> [resource_url]")
        print("\n示例:")
        print("  python test_qwen_api.py your_token_here portal.qwen.ai")
        sys.exit(1)
    
    access_token = sys.argv[1]
    resource_url = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"\n配置:")
    print(f"  Access Token: {access_token[:20]}...")
    print(f"  Resource URL: {resource_url or 'default'}")
    
    # 运行测试
    results = []
    
    results.append(("健康检查", test_health()))
    results.append(("Qwen API 连接", test_qwen_connection(access_token, resource_url)))
    results.append(("Qwen 对话", test_qwen_chat(access_token, resource_url)))
    results.append(("Qwen 流式响应", test_qwen_stream(access_token, resource_url)))
    results.append(("长文本输入", test_long_context(access_token, resource_url)))
    results.append(("错误处理", test_error_handling(access_token)))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {name}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！Qwen API 集成验证成功。")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，请检查日志。")
        sys.exit(1)

if __name__ == "__main__":
    main()
