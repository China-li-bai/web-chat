# Canvas性能优化完整指南

## 概述

本指南基于MDN官方文档，详细介绍了Canvas性能优化的具体代码示例和实现方法，特别关注60FPS渲染、游戏循环优化等音乐游戏开发相关内容。

## 目录

1. [预渲染技术](#预渲染技术)
2. [坐标优化](#坐标优化)
3. [多层画布架构](#多层画布架构)
4. [高分辨率显示处理](#高分辨率显示处理)
5. [60FPS动画循环](#60fps动画循环)
6. [性能优化技巧](#性能优化技巧)
7. [完整代码示例](#完整代码示例)

---

## 预渲染技术

### OffscreenCanvas预渲染

使用OffscreenCanvas可以预先渲染静态内容，减少每帧的绘制开销。

```javascript
// 创建离屏画布
myCanvas.offscreenCanvas = document.createElement("canvas");
myCanvas.offscreenCanvas.width = myCanvas.width;
myCanvas.offscreenCanvas.height = myCanvas.height;

// 获取离屏画布的上下文
const offscreenCtx = myCanvas.offscreenCanvas.getContext("2d");

// 在离屏画布上绘制静态内容
offscreenCtx.drawImage(myImage, 0, 0);

// 在主画布上绘制离屏画布内容
myCanvas.getContext("2d").drawImage(myCanvas.offscreenCanvas, 0, 0);
```

### 图像预缩放

避免在drawImage中动态缩放图像，应该预先创建不同尺寸的版本。

```javascript
// 避免这样做（性能差）
ctx.drawImage(myImage, 0, 0, 100, 100); // 动态缩放

// 推荐做法（预先生成不同尺寸）
const imageCache = {
  small: createScaledImage(myImage, 50, 50),
  medium: createScaledImage(myImage, 100, 100),
  large: createScaledImage(myImage, 200, 200)
};

function createScaledImage(originalImage, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(originalImage, 0, 0, width, height);
  return canvas;
}
```

---

## 坐标优化

### 使用整数坐标

避免浮点坐标可以减少子像素渲染开销和抗锯齿计算。

```javascript
// 避免这样做（性能差）
ctx.drawImage(myImage, 0.3, 0.5);

// 推荐做法（使用整数坐标）
ctx.drawImage(myImage, Math.floor(0.3), Math.floor(0.5));

// 或者在绘制前对所有坐标进行取整
function drawWithIntegerCoordinates(ctx, image, x, y) {
  ctx.drawImage(image, Math.floor(x), Math.floor(y));
}
```

---

## 多层画布架构

### HTML结构

将不同类型的元素分层绘制，减少不必要的重绘。

```html
<div id="game-container">
  <!-- 背景层（静态） -->
  <canvas id="background-layer" width="800" height="600"></canvas>
  <!-- 游戏层（动态） -->
  <canvas id="game-layer" width="800" height="600"></canvas>
  <!-- UI层（动态） -->
  <canvas id="ui-layer" width="800" height="600"></canvas>
</div>
```

### CSS样式

使用CSS定位和层级控制画布叠加。

```css
#game-container {
  position: relative;
  width: 800px;
  height: 600px;
}

#background-layer,
#game-layer,
#ui-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 800px;
  height: 600px;
  border: 1px solid #000;
}

#background-layer {
  z-index: 1;
}

#game-layer {
  z-index: 2;
}

#ui-layer {
  z-index: 3;
}
```

### JavaScript分层绘制

```javascript
// 获取不同层的上下文
const backgroundCanvas = document.getElementById('background-layer');
const gameCanvas = document.getElementById('game-layer');
const uiCanvas = document.getElementById('ui-layer');

const bgCtx = backgroundCanvas.getContext('2d');
const gameCtx = gameCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');

// 只重绘变化的层
function updateBackground() {
  // 背景很少变化，可以预渲染
}

function updateGame() {
  // 游戏层每帧都需要重绘
  gameCtx.clearRect(0, 0, 800, 600);
  // 绘制游戏对象
  drawGameObjects(gameCtx);
}

function updateUI() {
  // UI层根据需要重绘
  uiCtx.clearRect(0, 0, 800, 600);
  // 绘制UI元素
  drawUI(uiCtx);
}
```

### 静态背景优化

对于大型静态背景，使用CSS背景而不是Canvas绘制。

```css
#game-container {
  background-image: url('background.jpg');
  background-size: cover;
  background-position: center;
}
```

---

## 高分辨率显示处理

### 设备像素比适配

```javascript
function setupHighDPI(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // 设置画布的实际尺寸
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  
  // 缩放上下文以匹配设备像素比
  ctx.scale(dpr, dpr);
  
  // 设置CSS尺寸
  canvas.style.width = canvas.clientWidth + 'px';
  canvas.style.height = canvas.clientHeight + 'px';
  
  return ctx;
}

// 使用示例
const canvas = document.getElementById('game-layer');
const ctx = setupHighDPI(canvas);
```

### Canvas缩放优化

使用CSS transform进行Canvas缩放，利用GPU加速。

```javascript
const canvas = document.getElementById('game-canvas');
const stage = document.getElementById('stage');

function scaleCanvas() {
  const scaleX = window.innerWidth / canvas.width;
  const scaleY = window.innerHeight / canvas.height;
  
  const scaleToFit = Math.min(scaleX, scaleY);
  const scaleToCover = Math.max(scaleX, scaleY);
  
  stage.style.transformOrigin = "0 0"; // 从左上角缩放
  stage.style.transform = `scale(${scaleToFit})`;
}

// 监听窗口大小变化
window.addEventListener('resize', scaleCanvas);
```

### 关闭透明度

当不需要透明度时，关闭它以启用浏览器优化。

```javascript
// 创建不透明的画布上下文
const ctx = canvas.getContext("2d", { alpha: false });
```

---

## 60FPS动画循环

### 标准requestAnimationFrame循环

```javascript
function gameLoop() {
  // 更新游戏状态
  updateGame();
  
  // 渲染当前帧
  renderGame();
  
  // 请求下一帧
  requestAnimationFrame(gameLoop);
}

// 启动游戏循环
requestAnimationFrame(gameLoop);
```

### 带时间控制的游戏循环

```javascript
let lastTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;

function gameLoop(currentTime) {
  // 计算时间差
  const deltaTime = currentTime - lastTime;
  
  // 如果时间差足够大，更新游戏
  if (deltaTime >= frameTime) {
    // 更新时间
    lastTime = currentTime - (deltaTime % frameTime);
    
    // 更新游戏状态
    updateGame(deltaTime);
    
    // 渲染当前帧
    renderGame();
  }
  
  // 请求下一帧
  requestAnimationFrame(gameLoop);
}

// 启动游戏循环
requestAnimationFrame(gameLoop);
```

### 完整的时钟动画示例

```javascript
const canvas = document.getElementById('clock-canvas');
const ctx = canvas.getContext('2d');

function drawClock() {
  const now = new Date();
  const hr = now.getHours() % 12;
  const min = now.getMinutes();
  const sec = now.getSeconds();
  
  // 清空画布
  ctx.clearRect(0, 0, 150, 150);
  
  // 保存状态
  ctx.save();
  
  // 移动到中心
  ctx.translate(75, 75);
  
  // 绘制时钟外圈
  ctx.beginPath();
  ctx.arc(0, 0, 65, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 绘制小时标记
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, -60);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
  
  // 绘制分钟标记
  for (let i = 0; i < 60; i++) {
    if (i % 5 !== 0) {
      ctx.save();
      ctx.rotate(i * Math.PI / 30);
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.lineTo(0, -60);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
  
  // 绘制时针
  ctx.save();
  ctx.rotate(
    hr * Math.PI / 6 +
    min * Math.PI / (6 * 60) +
    sec * Math.PI / (6 * 60 * 60)
  );
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -35);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  
  // 绘制分针
  ctx.save();
  ctx.rotate(
    min * Math.PI / 30 +
    sec * Math.PI / (30 * 60)
  );
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(0, -50);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  
  // 绘制秒针
  ctx.save();
  ctx.rotate(sec * Math.PI / 30);
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -55);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  
  // 绘制中心圆点
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
  
  // 恢复状态
  ctx.restore();
  
  // 显示数字时间
  canvas.innerText = `The time is: ${hr}:${min}`;
}

// 动画循环
function clock() {
  drawClock();
  requestAnimationFrame(clock);
}

// 启动时钟
requestAnimationFrame(clock);
```

---

## 性能优化技巧

### 脏矩形渲染

只重绘变化的区域，而不是整个画布。

```javascript
const dirtyRects = [];

function markDirtyRect(x, y, width, height) {
  dirtyRects.push({ x, y, width, height });
}

function renderDirtyRects(ctx) {
  dirtyRects.forEach(rect => {
    // 只清除和重绘脏矩形区域
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    drawObjectsInRect(ctx, rect);
  });
  dirtyRects.length = 0; // 清空脏矩形列表
}
```

### 批量绘制操作

将多个绘制操作合并，减少状态切换。

```javascript
// 避免频繁的状态切换
function drawObjectsEfficiently(ctx, objects) {
  // 按颜色分组
  const groupedObjects = groupByColor(objects);
  
  // 批量绘制相同颜色的对象
  Object.keys(groupedObjects).forEach(color => {
    ctx.fillStyle = color;
    groupedObjects[color].forEach(obj => {
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    });
  });
}
```

### 避免性能杀手

```javascript
// 避免使用这些性能开销大的属性
const avoidProperties = [
  'shadowBlur',     // 计算开销大
  'text rendering', // 文本渲染昂贵
  'complex gradients' // 复杂渐变
];

// 推荐做法：使用预渲染的图像代替
function createCachedShadow(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 一次性绘制阴影
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'black';
  ctx.drawImage(image, 0, 0);
  
  return canvas;
}
```

### Canvas清除优化

选择最适合的清除方法。

```javascript
// 方法1：clearRect() - 推荐用于部分清除
ctx.clearRect(0, 0, canvas.width, canvas.height);

// 方法2：fillRect() - 用于需要填充背景色的情况
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 方法3：重置画布尺寸 - 用于完全重置
canvas.width = canvas.width; // 注意：这会重置所有状态
```

---

## 完整代码示例

### 音乐游戏Canvas优化框架

```javascript
class OptimizedMusicGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.setupHighDPI();
    this.setupLayers();
    this.setupGameLoop();
  }
  
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = this.canvas.clientWidth + 'px';
    this.canvas.style.height = this.canvas.clientHeight + 'px';
  }
  
  setupLayers() {
    // 背景层（静态）
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = this.canvas.width;
    this.backgroundCanvas.height = this.canvas.height;
    this.bgCtx = this.backgroundCanvas.getContext('2d');
    
    // 游戏层（动态）
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.width = this.canvas.width;
    this.gameCanvas.height = this.canvas.height;
    this.gameCtx = this.gameCanvas.getContext('2d');
    
    // UI层（动态）
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.width = this.canvas.width;
    this.uiCanvas.height = this.canvas.height;
    this.uiCtx = this.uiCanvas.getContext('2d');
    
    // 预渲染背景
    this.renderBackground();
  }
  
  renderBackground() {
    // 使用整数坐标绘制背景
    this.bgCtx.fillStyle = '#000000';
    this.bgCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制静态UI元素
    this.bgCtx.fillStyle = '#333333';
    this.bgCtx.fillRect(0, 0, Math.floor(this.canvas.width * 0.8), this.canvas.height);
  }
  
  setupGameLoop() {
    this.lastTime = 0;
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    this.running = false;
  }
  
  start() {
    this.running = true;
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  stop() {
    this.running = false;
  }
  
  gameLoop(currentTime) {
    if (!this.running) return;
    
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= this.frameTime) {
      this.lastTime = currentTime - (deltaTime % this.frameTime);
      
      // 更新游戏状态
      this.update(deltaTime);
      
      // 渲染当前帧
      this.render();
    }
    
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  update(deltaTime) {
    // 更新游戏对象
    this.updateNotes(deltaTime);
    this.updateScore(deltaTime);
    this.updateEffects(deltaTime);
  }
  
  render() {
    // 清空游戏层
    this.gameCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制游戏对象
    this.renderNotes();
    this.renderEffects();
    
    // 清空UI层
    this.uiCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制UI
    this.renderUI();
    
    // 合成最终画面
    this.compose();
  }
  
  compose() {
    // 将所有层合成到主画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    this.ctx.drawImage(this.gameCanvas, 0, 0);
    this.ctx.drawImage(this.uiCanvas, 0, 0);
  }
  
  renderNotes() {
    // 使用批量绘制优化
    this.gameCtx.fillStyle = '#00ff00';
    this.gameCtx.strokeStyle = '#ffffff';
    
    this.notes.forEach(note => {
      const x = Math.floor(note.x);
      const y = Math.floor(note.y);
      
      this.gameCtx.fillRect(x, y, note.width, note.height);
      this.gameCtx.strokeRect(x, y, note.width, note.height);
    });
  }
  
  renderUI() {
    // 绘制分数
    this.uiCtx.fillStyle = '#ffffff';
    this.uiCtx.font = '20px Arial';
    this.uiCtx.fillText(`Score: ${this.score}`, 10, 30);
    
    // 绘制进度条
    this.uiCtx.fillStyle = '#ff0000';
    this.uiCtx.fillRect(10, 50, Math.floor(this.progress * 200), 20);
  }
}

// 使用示例
const game = new OptimizedMusicGame('game-canvas');
game.start();
```

---

## 总结

本指南涵盖了Canvas性能优化的核心技术和实现方法：

1. **预渲染技术**：使用OffscreenCanvas和图像缓存减少每帧开销
2. **坐标优化**：使用整数坐标避免子像素渲染开销
3. **多层架构**：分离静态和动态内容，减少不必要的重绘
4. **高分辨率适配**：正确处理设备像素比，确保清晰显示
5. **60FPS循环**：使用requestAnimationFrame实现流畅动画
6. **性能优化**：脏矩形渲染、批量绘制、避免性能杀手

这些技术对于开发高性能的Canvas应用，特别是音乐游戏等需要60FPS渲染的应用至关重要。通过合理使用这些优化技术，可以显著提升Canvas应用的性能和用户体验。

## 相关资源

- [MDN Canvas API文档](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN Canvas优化教程](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN Canvas基础动画](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [requestAnimationFrame API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)