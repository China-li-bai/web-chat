


1. 先列出“市面上可能出现”的免费模型清单：用递进追问法，逐次过滤“国内—国外—开放文档—兼容 OpenAI”三重标准，形成边查边筛的列表草案。  
2. 对列表中的每项做三件套填空：`endpoint、method、params、auth、quota` → 上官方文档抽取，缺位用演示接口或他人 SDK 代替。  
3. 把回填好的字段放成统一 Markdown 表格：便于后续脚本化。  
4. 代码示例分层复现：  
   • 第一层：仅演示最简 HTTP 调用（Python requests / fetch）。  
   • 第二层：加 token、retry、错误码提示。  
   • 第三层：给支持 SSE 的模型包装 async-iter / stream-parser。  
   先列函数骨架，再把每栏 API 的专属差异像插槽一样填进去。  
5. 整体流程用 Excel/Notebook 建模版：行=模型，列=关键字段，空值留 VLOOKUP/XLOOKUP 链接文档正则提取任务，可批量刷数据。



**报告日期：** 2025年10月16日

---

### **2025年全球免费大语言模型API调用研究报告**

#### **引言**

进入2025年，大语言模型（LLM）已深度融入软件开发与技术创新的各个层面。为了构建蓬勃的开发者生态，国内外众多领先的AI公司纷纷推出免费的API调用额度或完全免费的基础模型API。本报告旨在系统性地梳理和总结截至2025年10月，全球范围内（重点关注中国国内与国际主流）可用的免费大语言模型API，并提供详尽的Python与JavaScript调用示例，帮助开发者快速理解和集成这些前沿的人工智能能力。

报告发现，API市场呈现两大趋势：首先，“免费增值”模式成为主流，即提供有限制的免费层，以吸引开发者试用并转化为付费用户；其次，API接口规范正迅速向OpenAI的RESTful风格趋同，这极大地降低了开发者在不同模型间迁移和集成的成本。本报告将围绕这些发现，提供结构化的分析和可操作的代码实例。

---

### **第一部分：中国国内免费大语言模型API概览**

截至2025年下半年，中国国内“百模大战”的竞争格局促使各大厂商向开发者提供了极具吸引力的免费API方案。这些方案通常以免费的基础模型或在新用户注册时赠送大量调用额度的方式呈现。

以下是根据搜索结果整理的国内主流免费LLM API平台汇总：

| 提供商 | 模型名称/系列 | 免费额度/限制 | 是否支持流式响应 | 是否兼容OpenAI | 官方文档/平台入口 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **智谱AI** | GLM-4-Flash, GLM-4-AllTools 等 | GLM-4-Flash: Tokens总量无限, QPS: 2 ；新用户赠送额度  | 支持 | 是 | `open.bigmodel.cn` |
| **百度智能云千帆** | ERNIE-Speed-8K, ERNIE-Speed-128K | ERNIE-Speed-8K: RPM: 300, TPM: 300,000 ；部分模型提供免费调用量  | 支持 | 是 | `cloud.baidu.com/product/wenxinworkshop` |
| **腾讯云混元** | hunyuan-lite | 并发数限制为5 | 支持  | 是 | `cloud.tencent.com/product/hunyuan` |
| **科大讯飞星火** | Spark-lite | Tokens总量无限, QPS: 2, 永久有效 | 支持 | 否（有专用SDK） | `xinghuo.xfyun.cn` |
| **月之暗面 (Kimi)**  | moonshot-v1-8k/32k/128k | RPM: 3, TPM: 32,000 ；新用户赠送额度 | 支持 | 是  | `platform.moonshot.cn` |
| **百川智能** | Baichuan 3/4 等 | 新用户赠送￥80额度 | 支持 | 是 | `platform.baichuan-ai.com` |
| **深度探索 (DeepSeek)**  | deepseek-chat, deepseek-coder | 注册赠送额度（约500万tokens） | 支持 | 是  | `platform.deepseek.com` |
| **字节跳动豆包** | 豆包·Function call (32K) 等 | QPS: 2, QPM: 60, QPD: 3,000  | 支持 | 是 | `platform.doubao.com` |
| **中国科技云MaaS** | DeepSeek, Qwen, Spark 等多系列 | 提供统一API访问，具体额度依模型而定 | 支持 | 是  | `maas.cstcloud.cn` |


**分析与解读：**

*   **兼容性是关键**：绝大多数国内主流厂商（除讯飞星火提供专用SDK外）均提供了与OpenAI API兼容的端点。这意味着开发者可以使用同一套代码逻辑，通过简单地更换API基地址（Base URL）和密钥（API Key）来调用不同厂商的模型，极大地促进了生态的互操作性 。
*   **免费模型各有侧重**：轻量级或速度优化模型，如智谱的`GLM-4-Flash`、百度的`ERNIE-Speed`和腾讯的`hunyuan-lite`，是免费API的主要力量，它们在保证极快响应速度的同时，足以应对大多数常规的文本生成和理解任务 。
*   **流式响应成为标配**：为了提升交互式应用的体验（如聊天机器人），几乎所有主流API都支持流式响应（Streaming Response），允许服务器逐字或逐词地返回生成内容 。

---

### **第二部分：国际主流免费大语言模型API概览**

国际市场上，虽然完全永久免费的商业API较为罕见，但几乎所有主流提供商都设有免费试用层或为开发者提供初始赠送额度。此外，开源模型的繁荣也催生了多种免费或低成本的API调用方式。

| 提供商/平台 | 模型名称/系列 | 免费模式 | 是否支持流式响应 | 是否兼容OpenAI | 官方文档/平台入口 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAI** | GPT-3.5-Turbo, GPT-4 等 | 新账户提供免费试用额度  | 支持 | 是（作为标准） | `platform.openai.com` |
| **Google AI** | Gemini Pro | 通过Google AI Studio提供免费层，有速率限制  | 支持 | 否（有专用SDK和REST API） | `ai.google.dev` |
| **Anthropic** | Claude 3 Sonnet/Haiku | 新账户提供免费试用额度 | 支持 | 是 | `console.anthropic.com` |
| **Cohere** | Command R | 提供免费的开发者试用层，有速率限制  | 支持 | 是 | `cohere.com` |
| **Ollama** | Llama 3, Mistral, Qwen 等开源模型 | 本地部署，完全免费，资源消耗取决于本地硬件 | 支持 | 是 | `ollama.com` |
| **OpenRouter** | 聚合多种模型 | 每次调用收取少量费用，但通常有初始免费额度，可访问免费模型 | 支持 | 是  | `openrouter.ai` |
| **SiliconFlow** | Qwen, Llama, Starcoder 等 | 提供免费模型和赠送额度，支持通过OpenAI库调用  | 支持 | 是 | `siliconflow.cn` |


**分析与解读：**

*   **OpenAI兼容性引领全球**：OpenAI的API设计已成为事实上的行业标准。许多新兴平台和老牌厂商（如Anthropic, Cohere）都提供与其兼容的端点，以吸引庞大的OpenAI开发者群体 。
*   **开源模型本地化**：以Ollama为代表的工具极大地降低了在个人电脑上运行和调用强大开源模型的门槛。它通过提供一个本地的、与OpenAI兼容的API服务器，使得开发者可以完全免费、离线地进行开发和测试 。
*   **聚合平台价值凸显**：像OpenRouter这样的聚合平台，允许开发者用一个API密钥访问来自不同提供商的多种模型（包括一些免费或成本极低的模型），简化了模型选择和成本管理 。

---

### **第三部分：API调用核心技术解析与示例**

无论调用哪个平台的API，其核心流程都遵循相似的模式：**认证 -> 构建请求 -> 发送请求 -> 解析响应**。

#### **3.1 认证机制：API密钥**

目前最主流的认证方式是通过HTTP的`Authorization`请求头发送一个API密钥 。密钥通常以`Bearer`前缀开头。

**Python (使用 `requests` 库):**
```python
# (参考 
import requests

api_key = "YOUR_API_KEY"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
```


**JavaScript (使用 `fetch` API):**
```javascript
// (参考 
const apiKey = "YOUR_API_KEY";
const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
};
```

*注意：部分平台如百度千帆，需要先用API Key和Secret Key换取有时效性的`access_token`，再将`access_token`用于请求 。智谱AI则使用基于API Key生成的JWT (JSON Web Token) 进行认证 。*

#### **3.2 标准聊天完成请求 (非流式)**

标准的聊天完成请求通常是向一个类似 `/v1/chat/completions` 的端点发送一个`POST`请求 。请求体（body）是一个JSON对象，至少包含`model`和`messages`两个字段。

**Python (使用 `requests` 库):**
```python
# (综合参考 
import requests
import json

api_key = "YOUR_API_KEY"
base_url = "API_BASE_URL" # 例如 https://api.openai.com/v1

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "model": "MODEL_NAME", # 例如 "gpt-3.5-turbo"
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "你好，请介绍一下自己。"}
    ]
}

try:
    response = requests.post(f"{base_url}/chat/completions", headers=headers, data=json.dumps(data))
    response.raise_for_status()  # 如果状态码不是 2xx，则抛出异常

    # 解析响应
    result = response.json()
    print(result['choices']['message']['content'])

except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
    # 可以进一步解析 response.text 来获取API返回的错误信息
    # print(response.text)
```


**JavaScript (使用 `fetch` API):**
```javascript
// (综合参考 
const apiKey = "YOUR_API_KEY";
const baseUrl = "API_BASE_URL"; // 例如 https://api.openai.com/v1

const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
};

const body = JSON.stringify({
    "model": "MODEL_NAME", // 例如 "gpt-3.5-turbo"
    "messages": [
        { "role": "system", "content": "You are a helpful assistant." },
        { "role": "user", "content": "你好，请介绍一下自己。" }
    ]
});

async function getChatCompletion() {
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) {
            // 获取并抛出API返回的错误信息
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log(result.choices.message.content);

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

getChatCompletion();
```


#### **3.3 流式响应处理**

要启用流式响应，只需在请求体中增加`"stream": true`参数 。服务器会以[Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)格式返回数据流。

**Python (处理流式响应):**
```python
# (参考 
import requests
import json

# ... headers 和 base_url 设置同上 ...

data = {
    "model": "MODEL_NAME",
    "messages": [{"role": "user", "content": "请写一首关于秋天的诗"}],
    "stream": True # 启用流式响应
}

try:
    # 设置 stream=True，requests会以流的方式处理响应
    with requests.post(f"{base_url}/chat/completions", headers=headers, json=data, stream=True) as response:
        response.raise_for_status()
        full_content = ""
        # 遍历从服务器接收到的每一行数据
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                # SSE 格式的数据以 "data: " 开头
                if decoded_line.startswith('data: '):
                    # 移除 "data: " 前缀
                    json_str = decoded_line[6:]
                    # 检查是否是结束标志
                    if json_str.strip() == '[DONE]':
                        break
                    try:
                        chunk = json.loads(json_str)
                        # 提取内容增量
                        delta_content = chunk['choices']['delta'].get('content', '')
                        if delta_content:
                            full_content += delta_content
                            print(delta_content, end='', flush=True)
                    except json.JSONDecodeError:
                        print(f"\nCould not decode line: {json_str}")
        print("\n--- Stream Finished ---")

except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
```


**JavaScript (处理流式响应):**
```javascript
// (参考 

// ... apiKey, baseUrl, headers 设置同上 ...

const body = JSON.stringify({
    "model": "MODEL_NAME",
    "messages": [{ "role": "user", "content": "请写一首关于秋天的诗" }],
    "stream": true // 启用流式响应
});

async function getStreamingChatCompletion() {
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("\n--- Stream Finished ---");
                break;
            }
            
            const chunk = decoder.decode(value);
            // 一个数据块(chunk)可能包含多个SSE事件，用换行符分割
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') {
                        return; // 结束
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const deltaContent = parsed.choices.delta.content;
                        if (deltaContent) {
                            fullContent += deltaContent;
                            // 在浏览器环境中，可以直接更新DOM元素
                            process.stdout.write(deltaContent);
                        }
                    } catch (e) {
                        console.error("Could not parse JSON:", jsonStr);
                    }
                }
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

getStreamingChatCompletion();
```


---

### **第四部分：具体平台API调用实例**

本部分将以上述技术为基础，展示如何调用几个代表性的免费API。

#### **4.1 兼容OpenAI接口的通用调用方法**

对于智谱AI、月之暗面(Kimi)、百川智能、DeepSeek等众多提供OpenAI兼容接口的平台，我们可以使用统一的代码，只需替换`API_KEY`和`API_BASE_URL`即可。

**API 基地址 (Base URL) 列表 (参考 :**
*   **智谱AI:** `[https://open.bigmodel.cn/api/paas/v4](https://open.bigmodel.cn/api/paas/v4)`
*   **月之暗面 Kimi:** `[https://api.moonshot.cn/v1](https://api.moonshot.cn/v1)`
*   **百川智能:** `[https://api.baichuan-ai.com/v1](https://api.baichuan-ai.com/v1)`
*   **深度探索 DeepSeek:** `[https://api.deepseek.com/v1](https://api.deepseek.com/v1)`
*   **中国科技云 MaaS:** `[https://maas.cstcloud.cn/v1](https://maas.cstcloud.cn/v1)`
*   **Ollama (本地):** `[http://localhost:11434/v1](http://localhost:11434/v1)`

**示例：调用月之暗面 Kimi (`moonshot-v1-8k`)**

只需将第三部分代码中的 `API_KEY`, `API_BASE_URL`, 和 `MODEL_NAME` 替换为：
*   `api_key`: 从Kimi平台获取的密钥
*   `base_url`: `[https://api.moonshot.cn/v1](https://api.moonshot.cn/v1)`
*   `model`: `moonshot-v1-8k`

代码主体无需任何改动，即可成功调用。这种兼容性极大地提升了开发效率。

#### **4.2 百度千帆 (ERNIE-Speed) 调用示例**

百度千帆的认证流程稍有不同，需要先获取`access_token`。

**第一步：获取 `access_token` (Python)**
```python
import requests

# 从百度云千帆控制台获取 API Key 和 Secret Key
API_KEY = "YOUR_BAIDU_API_KEY"
SECRET_KEY = "YOUR_BAIDU_SECRET_KEY"
token_url = f"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={API_KEY}&client_secret={SECRET_KEY}"

response = requests.post(token_url)
access_token = response.json().get("access_token")
print(f"Access Token: {access_token}")
```


**第二步：调用聊天接口 (Python)**
```python
import requests
import json

# 上一步获取的 access_token
access_token = "YOUR_ACCESS_TOKEN" 
# ERNIE-Speed-8K 的端点
model_endpoint = "ERNIE-Speed-8K"
chat_url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{model_endpoint}?access_token={access_token}"

headers = {"Content-Type": "application/json"}
data = {
    "messages": [{"role": "user", "content": "你好，介绍一下百度千帆大模型平台。"}],
    "stream": False # 设为 True 可开启流式
}

response = requests.post(chat_url, headers=headers, json=data)
print(response.json()['result'])
```


#### **4.3 科大讯飞星火 (Spark-lite) 调用示例**

讯飞星火有其官方的SDK，封装了复杂的鉴权和WebSocket通信流程，推荐使用SDK进行调用。以下是使用其原生WebSocket API的概念性示例，实际开发请参考其官方文档。其认证涉及 HMAC-SHA256 签名，比简单的Bearer Token复杂。

```python
# 概念性示例，实际代码需参考讯飞官方SDK或文档
# 认证过程涉及对 host, date, request-line 进行 HMAC-SHA256 签名
# 通信方式为 WebSocket
# 此处不展示完整代码以避免误导，强调应查阅官方文档 
```


---

### **总结与展望**

本报告系统梳理了截至2025年10月国内外主流的免费大语言模型API。我们观察到，一个开放、兼容、且对开发者友好的API生态正在形成。

**核心结论：** 
1.  **免费成为入口**：国内外厂商普遍通过免费额度或免费基础模型API吸引开发者，降低创新门槛。
2.  **标准趋于统一**：以OpenAI为代表的API设计规范已成为行业事实标准，绝大多数新API都选择兼容，简化了开发者的集成工作。
3.  **流式响应是标配**：为满足实时交互应用的需求，流式响应功能已成为聊天API的必备特性。

**未来展望：**
*   **竞争加剧，额度更优**：随着市场竞争白热化，预计厂商将提供更慷慨的免费额度，模型性能也将持续提升。
*   **多模态API普及**：除了文本，对图像、音频的理解和生成能力将更多地通过免费API开放，如智谱AI的`GLM-4V` 。
*   **开发者工具链完善**：围绕这些API的工具链（如SDK、调试工具、集成框架）将更加成熟，进一步降低开发复杂度。

最后，鉴于AI领域的快速发展，API的端点、模型名称、速率限制和定价策略可能随时发生变化。**强烈建议开发者在实际项目中，始终以各平台发布的最新官方文档为最终参考依据。**


<span style='font-size:12px'>[AI生成]</span>


