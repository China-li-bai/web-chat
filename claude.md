# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI口語練習產品 - 基於Tauri的跨平台應用，支持語音識別、發音評分和間隔重複學習算法。

### 🎮 Game-Based Learning System (最新集成)
- **GamePlayPage.tsx**: 遊戲化單詞學習頁面 (route: `/game/play`)
  - 單詞選擇題遊戲 (英單 → 中翻)
  - 即時Canvas粒子反饋系統
  - 多難度級別：easy/medium/hard/expert
  - 計時挑戰與得分系統
  - FSRS學習數據實時同步
- **Canvas Particle Effects**: 即時視覺反饋系統，增強學習體驗
  - ✅ 成功答題：金色星星爆炸效果 (35粒子 + 15二次爆發)
  - ✅ 答錯重試：橙色旋轉粒子效果 (25粒子 + 15中心粒子)
  - 觸覺反饋 (Device Vibration) 整合
  - Web Audio API 音效系統
  - 1500ms最佳用戶體驗持續時間
- **Unified Learning Architecture**: 遊戲與學習系統完全整合，統一使用learningService.ts
- **Real-time Learning Analytics**: 即時學習數據記錄與FSRS算法同步

## Development Commands

```bash
# Development
npm run dev                 # Start Vite development server
npm run tauri:dev          # Start Tauri development mode 
npm run server:dev         # Start backend server with nodemon

# Build
npm run build              # Build for production
npm run tauri:build        # Build Tauri application

# Testing  
npm run test               # Run tests with Vitest
npm run test:ui            # Run tests with UI
npm run test:coverage      # Run tests with coverage

# Single test execution
npm test -- --run src/components/language-learning/ImmediateFeedback.test.tsx  # Run specific test file
npm test -- --run --reporter=verbose  # Run tests with detailed output

# Backend
npm run server             # Start backend server

# Using Development Scripts (Recommended)
chmod +x scripts/dev.sh    # Make script executable (first time only)
./scripts/dev.sh           # Start full development environment (frontend + backend)
```

## Technology Stack

- **Frontend**: React 18 + Vite + Tauri
- **UI Library**: Ant Design 5 + Radix UI components
- **State Management**: Zustand with immer middleware
- **Database**: wa-sqlite (WebAssembly SQLite) for local-first approach
- **Routing**: React Router DOM 6
- **🎮 Game System**: Canvas Particle Effects + Game Mechanics
- **✨ Visual Feedback**: Canvas 2D API + Web Audio API + Device Vibration API
- **AI Services**: Multiple providers (Gemini, OpenAI, iFlytek, Tencent)
- **Learning Algorithm**: FSRS (Free Spaced Repetition Scheduler) + SuperMemo + fsrs-browser
- **Audio Processing**: Web Audio API + MediaRecorder + WaveSurfer.js
- **Build Tools**: Vite + Vitest + PostCSS + TailwindCSS
- **Development**: TypeScript strict mode + ESLint + Prettier

## Entry Points & Key Files

- **Main App**: `src/app.jsx` - React app entry point with routing
- **Game Learning**: `src/pages/LanguageLearning/GamePlayPage.tsx` - 遊戲化學習主入口
- **Canvas Feedback**: `src/components/language-learning/ImmediateFeedback.tsx` - 粒子反饋系統
- **Learning Service**: `src/services/learningService.ts` - 統一學習邏輯服務層
- **Database Service**: `src/services/db.ts` - wa-sqlite數據庫操作

### Application Routes
- `/` - Home page
- `/practice` - General practice page
- `/today-plan` - Daily learning plan
- `/language-learning` - Main language learning hub
- `/learning-session/:wordbookId` - Traditional learning session
- `/statistics` - Learning statistics dashboard
- `/review-planner` - FSRS-based review planning
- `/progress` - Learning progress tracking
- `/settings` - Application settings
- `/particle-test` - Visual effects testing page
- `/game` - Game hub (`GameHomePage`)
- `/game/play` - Active game session (`GamePlayPage`)

## Common Development Workflows

### Adding New Learning Features
1. Define types in `src/types/` directory first
2. Update `learningService.ts` for data operations
3. Create components in appropriate `src/pages/` or `src/components/` directories
4. Integrate with FSRS algorithm via `MemoryLearningManager.ts`
5. Add Canvas feedback if visual response needed

### Adding Game Mechanics
1. Extend `GamePlayPage.tsx` game state management
2. Update `useImmediateFeedback` hook for new visual effects
3. Ensure FSRS data sync via `learningService.ts`
4. Test on multiple difficulty levels

### Database Schema Changes
1. Update schema in `src/services/database/schemas/` with proper TypeScript types
2. Add migration in `src/services/database/migrations/`
3. Update service layer functions in `learningService.ts`
4. Test with both new and existing data

## Core Architecture

### Database Layer (`src/services/database/`)
- Uses wa-sqlite with IndexedDB VFS for persistence
- Unified `databaseService` interface with type-safe query methods
- Auto-migration system for schema updates with `MigrationManager`
- Domain-specific schemas: learning, practice, game, user
- Tables: wordbooks, words, learning_progress, study_logs, learning_statistics
- Self-healing database corruption recovery

### State Management (`src/store/`)
- `useAppStore.ts` - Main application state (user, practice sessions, settings)
- `wordbook-simple.ts` - Wordbook management using existing DB structure
- `learning.ts` - Learning session state management
- All stores use Zustand with immer for immutable updates

### Learning System (`src/lib/memo/`)
- `MemoryLearningManager.ts` - Core FSRS implementation
- `algorithms/` - Spaced repetition, active retrieval, difficulty adaptation
- Supports multiple learning modes and progress tracking

### wa-sqlite Integration (`src/packages/wa-sqlite-adapter/`)
- Custom adapter for wa-sqlite database operations
- `BasicDatabase` class for connection management  
- Type-safe query execution with error handling
- IndexedDB VFS for persistent local storage
- Auto-migration system for schema updates

### Game Architecture (`src/pages/LanguageLearning/GamePlayPage.tsx`)
- **Game State Management**: Integrated with Zustand stores (`useAppStore`, game-specific stores)
- **Question Flow**: Vocabulary matching with multiple choice options
- **Difficulty Levels**: easy/medium/hard/expert with dynamic question generation
- **Real-time Feedback**: Canvas particle effects + haptic + audio feedback
- **FSRS Integration**: Immediate learning progress updates via `learningService.ts`
- **Timer System**: Countdown challenges with score tracking
- **Session Management**: Complete game lifecycle from start to finish

### AI Services (`src/modules/ai/`)
- Multiple LLM providers (OpenAI, Gemini, etc.)
- Prompt templates for language learning scenarios
- Wordbook generation and content creation

### Learning Pages (`src/pages/LanguageLearning/`)
- `WordbookManagementPageSimple.tsx` - Simplified wordbook management (route: `/wordbooks`)
- `LearningSessionPageSimplified.tsx` - 3-button learning interface 
- `StatisticsPage.tsx` - Learning progress visualization
- `GamePlayPage.tsx` - 🎮 遊戲化單詞學習頁面 (route: `/game/play`)

### Canvas Particle Feedback System (`src/components/language-learning/`)
- `ImmediateFeedback.tsx` - 即時視覺反饋系統
  - 基於Canvas的粒子動效引擎 (StarParticle, FireworkParticle, Particle)
  - 支援多種反饋類型：success(成功), retry(重試), reveal(翻轉), progress(進度), milestone(里程碑), session-complete(完成)
  - 觸覺反饋 (Haptic) 和音效反饋 (Audio) 整合
  - 響應式設計，自動適配設備屏幕尺寸
- `useImmediateFeedback` Hook - 簡化反饋系統使用

## Database Schema

Key tables and relationships:
- `wordbooks` - Vocabulary collections (id, name, description, createdAt)
- `words` - Individual vocabulary items (wordbookId, userId, word, definition, etc.)
- `learning_progress` - FSRS state tracking (stability, retrievability, difficulty, nextReview)
- `study_logs` - Learning session records for analytics

## FSRS Learning Flow

1. User selects wordbook → creates learning session
2. Words fetched based on review schedule (nextReview ≤ current time)
3. User responds (Again/Hard/Good/Easy) → FSRS updates parameters
4. Progress saved to learning_progress table
5. Statistics updated for dashboard display

## Learning Data Recording System

### Real-time Progress Tracking
每次学习单词时，系统执行原子事务更新数据库：

```sql
-- 更新学习进度
UPDATE learning_progress
SET 
  stability = ?,           -- 记忆稳定性
  retrievability = ?,      -- 可提取性 
  difficulty = ?,          -- 难度系数
  nextReview = ?,          -- 下次复习时间
  lastReview = ?,          -- 最后复习时间
  state = ?,               -- 学习状态
  reviewCount = reviewCount + 1
WHERE wordId = ? AND userId = ?

-- 记录学习日志
INSERT INTO study_logs
(itemId, userId, timestamp, response, responseTime, confidence, 
 previousStability, previousRetrievability, newStability, newRetrievability)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### Progress Evaluation Metrics
- **即时正确率**: `(正确数/总数) × 100%`
- **响应时间**: 平均反应速度，反映熟练程度
- **预计保持率**: 基于正确率和响应时间计算的记忆保持概率
- **认知负荷**: 反映学习难度的认知压力指数
- **掌握度分布**: mastered/shaky/forgotten 分类统计

### Learning Session Assessment
学习段落后自动生成详细报告：
- 段落实时统计：完成数/总数/正确率
- 预计保持率：基于FSRS算法的记忆预测
- 认知负荷：学习压力和难度评估
- 个性化建议：根据表现调整学习策略

### Long-term Analytics
数据用于长期趋势分析：
- **学习热力图**: 显示每日学习量
- **正确率趋势**: 历史表现变化
- **响应时间统计**: 熟练度提升轨迹
- **词书掌握度**: 相对总词汇量的掌握比例

### Database Schema Details

#### learning_progress 表结构
```sql
- wordId: 单词ID
- userId: 用户ID
- stability: 记忆稳定性 (0-1)
- retrievability: 可提取性 (0-1)
- difficulty: 难度系数 (0-1)
- nextReview: 下次复习时间 (FSRS计算)
- lastReview: 最后复习时间
- state: 学习状态 (new/learning/review/relearning)
- reviewCount: 复习次数
- lapseCount: 遗忘次数
```

#### study_logs 表结构
```sql
- itemId: 学习项目ID
- userId: 用户ID
- timestamp: 学习时间戳
- response: 学习响应 (again/hard/easy)
- responseTime: 响应时间(毫秒)
- confidence: 置信度
- previousStability: 更新前稳定性
- previousRetrievability: 更新前可提取性
- newStability: 更新后稳定性
- newRetrievability: 更新后可提取性
```

### Assessment Standards
- **优秀**: 正确率 > 85%，响应时间 < 3秒
- **良好**: 正确率 70-85%，响应时间 3-5秒  
- **需改进**: 正确率 < 70%，响应时间 > 5秒

### Key Learning Services
- `learningService.ts`: 核心学习逻辑和数据持久化
- `statsService.ts`: 长期统计数据和分析
- `SessionSummaryModal.tsx`: 学习后效果展示
- `StatisticsPage.tsx`: 长期学习趋势分析

## Important File Locations

- Database service: `src/services/database/index.ts` - 统一数据库服务层
- Learning algorithm: `src/lib/memo/MemoryLearningManager.ts`
- **🎮 Game Learning**: `src/pages/LanguageLearning/GamePlayPage.tsx`
- **✨ Canvas Feedback**: `src/components/language-learning/ImmediateFeedback.tsx`
- **🔧 Unified Learning Service**: `src/services/learningService.ts` - 遊戲與學習系統統一服務層
- Main routing: `src/app.jsx`
- Wordbook management: `src/store/wordbook-simple.ts`
- FSRS config: `src/config/fsrs-config.ts`

### 🚫 已移除的服務層 (架構優化)
- ~~`wordbookService.ts`~~ - 已合併至 `learningService.ts`，避免重複功能

## Development Notes

- Use TypeScript strictly - define types before implementation
- All interfaces stored in `src/types/` directory
- Database operations use prepared statements for security
- Learning sessions maintain state consistency with FSRS algorithm
- Component file size limit: 300 lines (TypeScript/JavaScript)
- Maximum 8 files per directory - use subdirectories if exceeded

## Summary instructions

When you are using compact, please focus on test output and code changes

撰寫具體查詢：避免觸發不必要掃描的模糊請求

分解複雜任務：將大型任務分割為專注的互動

在任務之間清除歷史：使用 /clear 重置上下文

「老虎机」式重构：面对那些用编辑器宏太复杂、又不足以投入大量开发精力去解决的重构任务。先提交当前状态，然后放手让 Claude 自主工作 30 分钟。如果结果令人满意，就接受；如果不满意，就直接回滚重来

## Documentation
- 開始複雜任務時需要编写 .md 文档
- 正式文档写到项目的 docs/ 目录下
- 用于讨论和评审的计划、方案等文档，写到项目的 discuss/ 目录下


## Code Architecture

- 编写代码的硬性指标，包括以下原则：
  （1）对于 Python、JavaScript、TypeScript 等动态语言，尽可能确保每个代码文件不要超过 300 行
  （2）对于 Java、Go、Rust 等静态语言，尽可能确保每个代码文件不要超过 400 行
  （3）每层文件夹中的文件，尽可能不超过 8 个。如有超过，需要规划为多层子文件夹
- 除了硬性指标以外，还需要时刻关注优雅的架构设计，避免出现以下可能侵蚀我们代码质量的「坏味道」：
  （1）僵化 (Rigidity): 系统难以变更，任何微小的改动都会引发一连串的连锁修改。
  （2）冗余 (Redundancy): 同样的代码逻辑在多处重复出现，导致维护困难且容易产生不一致。
  （3）循环依赖 (Circular Dependency): 两个或多个模块互相纠缠，形成无法解耦的“死结”，导致难以测试与复用。
  （4）脆弱性 (Fragility): 对代码一处的修改，导致了系统中其他看似无关部分功能的意外损坏。
  （5）晦涩性 (Obscurity): 代码意图不明，结构混乱，导致阅读者难以理解其功能和设计。
  （6）数据泥团 (Data Clump): 多个数据项总是一起出现在不同方法的参数中，暗示着它们应该被组合成一个独立的对象。
  （7）不必要的复杂性 (Needless Complexity): 用“杀牛刀”去解决“杀鸡”的问题，过度设计使系统变得臃肿且难以理解。
- 【非常重要！！】无论是你自己编写代码，还是阅读或审核他人代码时，都要严格遵守上述硬性指标，以及时刻关注优雅的架构设计。
- 【非常重要！！】无论何时，一旦你识别出那些可能侵蚀我们代码质量的「坏味道」，都应当立即询问用户是否需要优化，并给出合理的优化建议。

## 推荐 SQL 构建器（避免手写字符串）
1. squel
功能：轻量级 JavaScript SQL 查询字符串构建器，通过链式、面向对象 API 自动拼接 SQL，避免手动字符串拼接和引号问题。
适用场景：动态构建 SELECT、INSERT、UPDATE、DELETE 等标准 SQL，适合需要灵活拼接条件的场景。
特点：
支持 Node.js 和浏览器
方法链式调用，代码清晰
官方提醒：不要在前端构建要发往后端执行的 SQL，防范 SQL 注入风险

## 用类型系统 /静态校验
如果用 TypeScript 或其他强类型语言，从 schema (数据库结构) 生成类型，这样写错列名、字段类型错误等能在编译／build 阶段就发现，而不是运行时报错。

## 把 SQL 放在专门的模块／文件里
把 SQL 语句或 query builder 调用集中于 data layer，不散布在 UI /业务逻辑里。这样易维护，也易重构。

## 写格式良好的 SQL

合适的缩进

用别名清晰（table alias, column alias）

不用 SELECT *（只选必要的字段）

分页 /限制(LIMIT / OFFSET)早加

清晰的 WHERE 和 JOIN 条件，不要滥用子查询或嵌套复杂度过高的表达式 
DEV Community
+1

## 测试 & 模拟错误
写一些单元／集成测试去验证 SQL 输出／逻辑正确；尝试用无效／极端输入来测试 SQL 是否还健壮。

## 安全性优先

注入风险：参数化、逃逸特殊字符

权限控制：最小权限原则，只给数据库账号用到的权限

日志监控：SQL 执行错误、时间长的 query 等要监测


## Run & Debug

- **⚠️ REQUIRED**: Maintain all Run & Debug scripts in `scripts/` directory
- **⚠️ REQUIRED**: Always use `.sh` scripts for all start/stop operations, never run npm/pnpm directly
- **⚠️ REQUIRED**: Fix any script failures immediately, then continue using .sh scripts
- **⚠️ REQUIRED**: Configure Logger with File Output to `logs/` directory before debugging

### Available Development Scripts
```bash
# Full development environment (frontend + backend)
./scripts/dev.sh

# HTTP setup and validation
./scripts/setup-app-http.sh
./scripts/simple-validate.cjs
./scripts/validate-refactor.cjs

# HTTPS/Cloudflare setup
./scripts/switch-to-https-cf.sh
```

## Quick Reference

### Common Tasks
- **Start development**: `./scripts/dev.sh` (recommended) or `npm run dev` + `npm run tauri:dev`
- **Run single test**: `npm test -- --run src/file.test.tsx`
- **Check TypeScript**: `npm run build` (includes type checking)
- **View learning data**: Access wa-sqlite database via browser dev tools
- **Debug Canvas effects**: Check browser console for particle system logs
- **Game testing**: Navigate to `/game/play` route for game mechanics
- **Particle testing**: Navigate to `/particle-test` route for visual effects testing

### Key Dependencies
- **Tauri**: Cross-platform desktop app framework (^2.7.0)
- **wa-sqlite**: WebAssembly SQLite for local-first storage (^1.0.0)
- **FSRS**: Multiple FSRS implementations - fsrs-browser (^4.1.1), ts-fsrs (^5.2.3), @open-spaced-repetition/sm-2 (^0.2.1)
- **Zustand**: Lightweight state management (^4.4.0)
- **Ant Design**: UI component library (^5.12.0)
- **AI SDK**: Multiple AI providers - @ai-sdk/openai (^2.0.52), @google/genai (^1.0.0), @google/generative-ai (^0.24.1)
- **Audio**: WaveSurfer.js (^7.0.0), RecordRTC (^5.6.0)
- **Testing**: Vitest (^0.34.6) with UI support



## 开发时前端項目的一些注意事项
- 项目采用 npm 作为包管理工具
- 项目采用 TypeScript 作为开发语言
- 项目采用 React  作为前端框架
- 项目采用 Vite 作为构建工具
- 项目采用 Tauri 作为跨平台打包工具
- 严格控制版本依赖，避免版本冲突
- 使用@tauri-apps/cli 和 vite cli 进行项目的初始化和打包
- 项目采用 wa-sqlite 数据库，支持本地存储
- 开发ts 项目时，先定义好类型，再编写代码，接口类型全部统一存放到项目types文件夹下，避免类型错误

---

## 📝 Recent Updates & Integration Log

### 🎯 Canvas Particle Effects System Integration (最新完成)

**Date**: 2025-11-05  
**Status**: ✅ COMPLETED

**Key Achievements**:
1. **GamePlayPage.tsx Canvas Integration**:
   - ✅ 完整集成 `useImmediateFeedback` hook
   - ✅ 成功和重試反饋系統全面實現
   - ✅ 所有狀態頁面統一添加反饋層 (加載、錯誤、遊戲開始、遊戲結束)

2. **Enhanced Visual Effects**:
   - ✅ 成功答題：35金色星星粒子 + 15二次爆發粒子
   - ✅ 答錯重試：25橙色旋轉粒子 + 15中心爆炸粒子  
   - ✅ Canvas z-index 10002確保層級正確
   - ✅ 1500ms優化用戶體驗持續時間

3. **Architecture Unification**:
   - ✅ 移除 `wordbookService.ts` 重複功能
   - ✅ 統一使用 `learningService.ts` 作為唯一服務層
   - ✅ 遊戲與學習系統數據完全同步
   - ✅ FSRS學習算法實時記錄

4. **Multi-modal Feedback**:
   - ✅ 觸覺反饋 (Device Vibration API)
   - ✅ 音效反饋 (Web Audio API)
   - ✅ 視覺粒子動效 (Canvas 2D API)

**Technical Verification**:
- ✅ TypeScript編譯無錯誤
- ✅ Vite開發服務器啟動成功
- ✅ 所有導入依賴解析正確
- ✅ 無破壞性變更向後兼容

**File Structure Updates**:
- `GamePlayPage.tsx` - 遊戲化學習主頁面 + Canvas反饋系統
- `ImmediateFeedback.tsx` - 增強型粒子動效引擎
- `ImmediateFeedback.css` - Z-index衝突修復


**Next Steps**:
- 🎯 測試不同設備上的Canvas粒子性能
- 🎯 優化低端設備的粒子數量
- 🎯 添加更多反饋類型的視覺效果

### 🎯 Phase 2: 核心服务迁移完成

**Date**: 2025-11-06  
**Status**: ✅ COMPLETED

**Key Achievements**:
1. **Database Service Unification**:
   - ✅ 重构数据库服务层到 `src/services/database/`
   - ✅ 统一 `databaseService` 接口替代旧的 `db.ts`
   - ✅ 类型安全的查询方法和域特定模式
   - ✅ 修复所有导入路径和 `db.exec` 错误

2. **Service Layer Consolidation**:
   - ✅ 合并 `wordbookService.ts` 功能到 `learningService.ts`
   - ✅ 移除重复的服务文件，避免功能重复
   - ✅ 更新所有组件导入路径
   - ✅ 保持功能完整性和向后兼容

3. **Unified Learning Architecture**:
   - ✅ `learningService.ts` 现包含词书管理、学习会话、FSRS算法
   - ✅ 统一数据库访问模式
   - ✅ 简化服务层依赖关系

**Technical Verification**:
- ✅ TypeScript编译无错误
- ✅ 开发服务器启动成功  
- ✅ 所有服务功能正常运行
- ✅ 数据库迁移和类型安全验证通过

**File Structure Updates**:
- `src/services/database/` - 新的统一数据库服务层
- `src/services/learningService.ts` - 合并后的学习服务 (含词书管理)
- ~~`src/services/wordbookService.ts`~~ - 已移除，功能合并至 learningService.ts
- ~~`src/services/db.ts`~~ - 已替换为新的database服务架构