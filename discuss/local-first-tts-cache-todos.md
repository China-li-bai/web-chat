# 口语练习页 Local-First 语音缓存（/practice）Todos

目标：使用 wa-sqlite 将 AI 生成的语音本地化缓存；再次点击“AI语音”优先读本地缓存，不再调用接口；提供必要的 UI 提示与缓存管理。

进度：2/12

## 设计要点（简版）
- 缓存键：SHA-256(text + '|' + voiceStyle + '|' + lang + '|' + providerVersion)
- 表结构：audio_cache(key TEXT PRIMARY KEY, text TEXT, voice_style TEXT, lang TEXT, provider TEXT, created_at INTEGER, size INTEGER, audio_blob BLOB)
- 流程：
  1) 计算 key
  2) SELECT audio_blob FROM audio_cache WHERE key=?
  3) 命中：播放（标注“本地缓存”）
  4) 未命中：TTS 调用 → INSERT … → 播放（标注“网络生成”）

## Todos
- [x] ~~需求确认（移除第三方哈希库，采用 SubtleCrypto SHA-256）~~
- [x] ~~生成本 todos 文档~~
- [x] ~~安装并配置 wa-sqlite 依赖（Vite WASM 资源处理验证）~~
- [x] ~~初始化数据库与表（audio_cache）及必要索引（created_at）~~
- [x] ~~实现哈希键工具（SubtleCrypto + TextEncoder）~~
- [x] ~~实现缓存 DAO：getByKey、put、stats、clearAll、clearExpired(可选)~~
- [x] ~~扩展 TTS 服务模块：生成前先查缓存，未命中再调接口，成功后写缓存~~
- [x] ~~集成到 /practice 页面 “🤖 AI语音” 按钮（状态提示：本地/网络）~~
- [x] ~~UI 指示与反馈：本地缓存命中（绿色）、网络生成（蓝色）、错误降级~~
- [ ] 缓存管理入口（可选）：统计（数量/空间）、清理全部
- [ ] 测试用例：命中/未命中、参数变化、异常降级、离线播放
- [ ] 文档补充：使用说明与注意事项（浏览器/tauri 环境差异）

## Schema 草案
```sql
CREATE TABLE IF NOT EXISTS audio_cache (
  key TEXT PRIMARY KEY,
  text TEXT,
  voice_style TEXT,
  lang TEXT,
  provider TEXT,
  created_at INTEGER,
  size INTEGER,
  audio_blob BLOB
);
CREATE INDEX IF NOT EXISTS idx_audio_cache_created_at ON audio_cache(created_at);
```

## Key 计算示例（伪代码）
```ts
const payload = `${text}|${voiceStyle}|${lang}|${providerVersion}`;
const buf = new TextEncoder().encode(payload);
const hashBuf = await crypto.subtle.digest('SHA-256', buf);
const key = [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
```

## 验收清单（通过即勾选）
- [ ] 相同文本与参数二次点击“AI语音”不再发起 TTS 请求
- [ ] 切换 voiceStyle 或文本后可正确生成并缓存
- [ ] 断网情况下能播放已缓存语音
- [ ] UI 明确标注“本地缓存/网络生成”
- [ ] 可一键清理缓存并恢复网络生成流程