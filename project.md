為了幫你把「Learning How to Learn」的全部學習與記憶方法轉化成一款真正可用、可成長、又可商業化的 App，我把它拆成 6 個步驟：  
1. 方法盤點 → 2. 功能對應 → 3. 用戶流程 → 4. 演算法與資料結構 → 5. 技術最小可行版本（MVP）→ 6. 可持續迭代路線圖。  


────────────────  
STEP 1　方法盤點（全部列出，不留死角）  
A. 學習底層機制  
　A1 專注模式（Focused Mode）  
　A2 發散模式（Diffuse Mode）  
　A3 切換節律：番茄鐘 25/5、90/20、52/17…  
B. 組塊化（Chunking）  
　B1 生成組塊：回憶→重組→壓縮  
　B2 固化組塊：間隔重複（Spaced Repetition）  
　B3 交叉學習（Interleaving）  
C. 拖延系統  
　C1 觸發器（Trigger）識別  
　C2 2 分鐘啟動法  
　C3 習慣堆疊（Habit Stacking）  
D. 記憶強化  
　D1 提取練習（Active Recall）  
　D2 圖像聯想（Visual Metaphor & Memory Palace）  
　D3 睡眠與遺忘曲線（Forget-Curve & Sleep Consolidation）  
E. 高階策略  
　E1 清單法（Checklist Manifesto for Learning）  
　E2 自我測試效應（Testing Effect）  
　E3 反思日誌（Metacognitive Journal）

────────────────  
STEP 2　功能→方法 一對一映射  
| 方法 | App 功能 | 備註 | 1.0 必做？ |
|---|---|---|---|
| A1/A2/A3 | 番茄鐘 + 自動切 Diffuse 提示 | 背景播放白噪音、震動提醒 | ✅ |
| B1 | 「生成組塊」編輯器（卡片正面：提示；背面：答案+圖像） | 支援拍照、錄音、塗鴉 | ✅ |
| B2 | 間隔重複演算法（SM-2 簡化版） | 可調難度 1-5 | ✅ |
| B3 | 交叉練習排程器（按 Tag 打亂） | Tag 體系：學科/章節/題型 | ✅ |
| C1/C2 | 拖延日記 + 2-min 倒計時小部件 | 桌面一鍵啟動 | ✅ |
| C3 | 習慣鏈：「學習後→喝水→走動」可自訂 | 與 Apple Health / Google Fit 打通 | 2.0 |
| D1 | 學習模式：先「回憶」再顯示答案 | 手勢滑動揭曉 | ✅ |
| D2 | 圖像聯想模板庫（章魚=工作記憶等） | 內建 50 張免費插圖 | ✅ |
| D3 | 睡眠追蹤整合 & 推播提醒「該睡了」 | 就寢前 5 分鐘快閃複習 | ✅ |
| E1/E2/E3 | 每週「學習體檢」報告 + 導出 PDF | 圖表：記憶保留率 vs 預測遺忘 | 2.0 |

────────────────  
STEP 3　最小用戶流程（User Journey）  
1. 註冊 → 2. 選擇「我要學習的科目」 → 3. 首次番茄鐘（立刻體驗 A3）→ 4. 結束後彈窗「是否把剛剛學的做成組塊？」→ 5. 引導拍照/輸入 → 6. 自動進入間隔重複隊列 → 7. 第二天推送「複習時間到」→ 8. 滑動回憶 → 9. 回報難度 → 10. 系統更新下次複習日期。  
整條路徑 30 秒可閉環，確保首日留存。

────────────────  
STEP 4　演算法與資料結構（可直接給工程師）  
- SM-2 簡化公式  
```
next = today + interval  
interval = previous * (2.5 - rating)   // rating 0-5  
if rating < 3 then interval = 1  
```
- 交叉打亂  
```
cards.shuffle(tag == todayTag).take(5)  
```
- 遺忘預測  
```
retention = e^(-t/S)  // t 為已過天數，S 為 SuperMemo 計算出的穩定度
```
- 本地資料同步

────────────────  
STEP 5　技術 MVP（6–8 週可完成）  
 
- 關鍵套件：  
  - （番茄鐘）  
  - （間隔重複）  
  - `audioplayers`（白噪音）  
  - `image_picker`（拍照建卡）  
- 付費牆：免費 50 張卡，超限後訂閱制 $1.99/月。

────────────────  

────────────────  
下一步動作清單（可直接執行）  
1. 本週內用 Figma 畫出 5 張核心頁面（計時器、建卡、複習、報告、設定）。  
2. 下載我提供的「SM-2 Dart 程式碼範例」→ 跑通離線複習邏輯。  
3. 在 Product Hunt/Reddit r/GetStudying 發「等待名單」Landing Page，收集 100 個 Email 驗證需求。  
4. 找我拿「50 張免費聯想插圖」壓縮包，直接放 assets，省設計師預算。
