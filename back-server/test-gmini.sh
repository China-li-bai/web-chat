#!/bin/bash

# 测试脚本 - 验证Gemini API代理配置是否正常工作

echo "开始测试Gemini API代理配置..."
echo "=========================================="

# 测试基本连接
echo "1. 测试基本连接:"
echo "------------------"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n连接时间: %{time_connect}s\n总时间: %{time_total}s\n" 192.227.177.133/v1beta/models

echo ""

# 测试获取模型列表
echo "2. 测试获取模型列表:"
echo "------------------"
response=$(curl -s https://gemini.66666618.xyz/v1beta/models)
if [ $? -eq 0 ]; then
    echo "请求成功！"
    echo "可用模型:"
    echo "$response" | grep -o '"name":"[^"]*"' | head -10
    echo ""
    echo "模型数量:"
    echo "$response" | grep -o '"name":"[^"]*"' | wc -l
else
    echo "请求失败，请检查配置和网络连接"
fi

echo ""

# 测试CORS头部
echo "3. 测试CORS头部配置:"
echo "------------------"
curl -s -I -X OPTIONS https://gemini.66666618.xyz/v1beta/models | grep -i "access-control"

echo ""

# 测试SSL证书
echo "4. 测试SSL证书:"
echo "------------------"
curl -s -I https://gemini.66666618.xyz/v1beta/models | grep -i "server\|cf-ray\|cloudflare"

echo ""

# 测试代理头部
echo "5. 测试代理头部:"
echo "------------------"
curl -s -I https://gemini.66666618.xyz/v1beta/models | head -10

echo ""

# 测试具体API调用（需要API密钥）
echo "6. 测试API调用（需要API密钥）:"
echo "------------------"
if [ -n "$GEMINI_API_KEY" ]; then
    echo "检测到API密钥，测试实际API调用..."
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{
                "parts": [{
                    "text": "Hello, this is a test message."
                }]
            }]
        }' \
        "https://gemini.66666618.xyz/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" | head -5
else
    echo "未设置GEMINI_API_KEY环境变量，跳过实际API调用测试"
    echo "如需测试实际API调用，请设置环境变量："
    echo "export GEMINI_API_KEY=your_api_key_here"
fi

echo ""
echo "=========================================="
echo "测试完成！"
echo ""
echo "如果所有测试都通过，说明Gemini代理配置正常。"
echo "如果有任何失败，请检查："
echo "1. Nginx配置是否正确"
echo "2. Cloudflare DNS设置是否正确"
echo "3. 防火墙是否允许80/443端口"
echo "4. 服务器网络连接是否正常"