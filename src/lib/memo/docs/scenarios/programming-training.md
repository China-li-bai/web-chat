# 编程技能训练场景

基于记忆学习算法栈的智能编程技能训练系统，涵盖算法、数据结构、设计模式等核心编程概念。

## 🎯 应用概述

### 核心功能
- **算法与数据结构学习** - 系统性掌握核心编程概念
- **代码实现练习** - 从理论到实践的完整训练
- **调试与优化挑战** - 提升代码质量和性能
- **技能评估分析** - 多维度编程能力评估

### 适用场景
- 计算机科学学习
- 编程面试准备
- 技术技能提升
- 代码质量改进

## 💻 完整实现代码

### 1. 核心数据结构

```typescript
import { MemoryLearningManager } from '../MemoryLearningManager';
import type { LearningItem, StudyRecord, StudySession } from '../types';

interface ProgrammingConcept {
  id: string;
  title: string;
  description: string;
  code: string;
  language: 'javascript' | 'python' | 'java' | 'cpp';
  category: 'algorithm' | 'data_structure' | 'design_pattern' | 'syntax';
  complexity: 'basic' | 'intermediate' | 'advanced';
  prerequisites: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
  keyPoints: string[];
  commonMistakes: string[];
  optimizationTips: string[];
}

interface ProgrammingSkillReport {
  userId: string;
  assessmentPeriod: number;
  overallSkillLevel: number;
  skillLevels: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextChallenges: string[];
  studyPath: StudyPathStep[];
  codeQualityMetrics: CodeQualityMetrics;
}

interface StudyPathStep {
  step: number;
  category: string;
  targetComplexity: 'basic' | 'intermediate' | 'advanced';
  concepts: string[];
  estimatedDuration: number;
  prerequisites: string[];
}

interface CodeQualityMetrics {
  readability: number;
  efficiency: number;
  maintainability: number;
  correctness: number;
  overallScore: number;
}
```

### 2. 编程技能训练系统

```typescript
class ProgrammingSkillTrainer {
  private memoryManager: MemoryLearningManager;
  private conceptDatabase: ProgrammingConcept[];
  
  constructor() {
    this.memoryManager = new MemoryLearningManager({
      fsrsConfig: {
        requestRetention: 0.85,
        maximumInterval: 120, // 4个月最大间隔
      },
      adaptiveConfig: {
        adaptationRate: 0.15,
        cognitiveLoadThreshold: 0.75
      },
      retrievalConfig: {
        testingEffectWeight: 0.5,    // 编程重视实践测试
        spacingEffectWeight: 0.3,
        generationEffectWeight: 0.2
      }
    });
    
    this.conceptDatabase = this.initializeProgrammingConcepts();
  }
  
  private initializeProgrammingConcepts(): ProgrammingConcept[] {
    return [
      {
        id: 'binary_search',
        title: '二分查找算法',
        description: '在有序数组中查找特定元素的高效算法',
        code: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}`,
        language: 'javascript',
        category: 'algorithm',
        complexity: 'intermediate',
        prerequisites: ['arrays', 'loops'],
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
        keyPoints: [
          '数组必须是有序的',
          '每次比较后搜索范围减半',
          '使用左右指针维护搜索边界',
          '中点计算避免整数溢出'
        ],
        commonMistakes: [
          '忘记检查数组是否有序',
          '边界条件处理错误',
          '中点计算方式不当',
          '循环终止条件错误'
        ],
        optimizationTips: [
          '使用位运算计算中点',
          '考虑递归实现的空间复杂度',
          '处理重复元素的情况'
        ]
      },
      {
        id: 'linked_list',
        title: '链表数据结构',
        description: '动态数据结构，元素通过指针连接',
        code: `class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }
  
  append(val) {
    const newNode = new ListNode(val);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }
  
  prepend(val) {
    const newNode = new ListNode(val, this.head);
    this.head = newNode;
    this.size++;
  }
  
  delete(val) {
    if (!this.head) return false;
    
    if (this.head.val === val) {
      this.head = this.head.next;
      this.size--;
      return true;
    }
    
    let current = this.head;
    while (current.next && current.next.val !== val) {
      current = current.next;
    }
    
    if (current.next) {
      current.next = current.next.next;
      this.size--;
      return true;
    }
    
    return false;
  }
}`,
        language: 'javascript',
        category: 'data_structure',
        complexity: 'basic',
        prerequisites: ['objects', 'classes'],
        timeComplexity: 'O(1) insert, O(n) search',
        spaceComplexity: 'O(n)',
        keyPoints: [
          '动态内存分配',
          '节点通过指针连接',
          '插入删除操作灵活',
          '不支持随机访问'
        ],
        commonMistakes: [
          '忘记更新头指针',
          '内存泄漏问题',
          '空指针访问',
          '循环链表处理'
        ],
        optimizationTips: [
          '使用哨兵节点简化操作',
          '双向链表提高删除效率',
          '缓存尾节点加速追加'
        ]
      },
      {
        id: 'quicksort',
        title: '快速排序算法',
        description: '分治法排序算法，平均时间复杂度为O(n log n)',
        code: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}`,
        language: 'javascript',
        category: 'algorithm',
        complexity: 'advanced',
        prerequisites: ['recursion', 'arrays', 'swapping'],
        timeComplexity: 'O(n log n) average, O(n²) worst',
        spaceComplexity: 'O(log n)',
        keyPoints: [
          '分治策略的典型应用',
          '基准元素的选择影响性能',
          '原地排序算法',
          '不稳定排序'
        ],
        commonMistakes: [
          '基准选择不当导致最坏情况',
          '分区函数实现错误',
          '递归边界条件处理',
          '栈溢出风险'
        ],
        optimizationTips: [
          '三数取中选择基准',
          '小数组使用插入排序',
          '尾递归优化',
          '迭代实现避免栈溢出'
        ]
      },
      {
        id: 'observer_pattern',
        title: '观察者模式',
        description: '定义对象间一对多的依赖关系，当一个对象状态改变时，所有依赖它的对象都会得到通知',
        code: `class Subject {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  notify(data) {
    this.observers.forEach(observer => observer.update(data));
  }
}

class Observer {
  constructor(name) {
    this.name = name;
  }
  
  update(data) {
    console.log(\`\${this.name} received: \${data}\`);
  }
}

// 使用示例
const subject = new Subject();
const observer1 = new Observer('Observer 1');
const observer2 = new Observer('Observer 2');

subject.subscribe(observer1);
subject.subscribe(observer2);
subject.notify('Hello World!');`,
        language: 'javascript',
        category: 'design_pattern',
        complexity: 'advanced',
        prerequisites: ['classes', 'arrays', 'callbacks'],
        timeComplexity: 'O(n) notify',
        spaceComplexity: 'O(n)',
        keyPoints: [
          '松耦合的对象交互',
          '支持广播通信',
          '动态的订阅关系',
          '事件驱动架构基础'
        ],
        commonMistakes: [
          '内存泄漏（未取消订阅）',
          '循环依赖问题',
          '异常处理不当',
          '通知顺序依赖'
        ],
        optimizationTips: [
          '异步通知避免阻塞',
          '优先级队列管理观察者',
          '弱引用防止内存泄漏',
          '批量通知优化性能'
        ]
      }
    ];
  }
  
  private convertToLearningItems(concepts: ProgrammingConcept[]): LearningItem[] {
    return concepts.map(concept => ({
      id: concept.id,
      content: `${concept.title}: ${concept.description}`,
      type: 'concept',
      difficulty: this.mapComplexityToNumber(concept.complexity),
      createdAt: new Date(),
      metadata: {
        title: concept.title,
        category: concept.category,
        language: concept.language,
        code: concept.code,
        timeComplexity: concept.timeComplexity,
        spaceComplexity: concept.spaceComplexity,
        prerequisites: concept.prerequisites,
        keyPoints: concept.keyPoints,
        commonMistakes: concept.commonMistakes,
        optimizationTips: concept.optimizationTips
      }
    }));
  }
  
  private mapComplexityToNumber(complexity: string): number {
    const mapping = {
      'basic': 0.3,
      'intermediate': 0.6,
      'advanced': 0.8
    };
    return mapping[complexity as keyof typeof mapping] || 0.5;
  }
  
  async createProgrammingSession(
    userId: string,
    focusArea: 'algorithm' | 'data_structure' | 'design_pattern' | 'all',
    skillLevel: 'basic' | 'intermediate' | 'advanced',
    sessionDuration: number = 1800 // 30分钟
  ) {
    console.log(`💻 为用户 ${userId} 创建编程技能训练会话`);
    console.log(`🎯 专注领域: ${focusArea}, 技能水平: ${skillLevel}`);
    
    // 根据专注领域和技能水平筛选概念
    let filteredConcepts = this.conceptDatabase;
    
    if (focusArea !== 'all') {
      filteredConcepts = filteredConcepts.filter(concept => concept.category === focusArea);
    }
    
    // 根据技能水平筛选
    filteredConcepts = filteredConcepts.filter(concept => {
      if (skillLevel === 'basic') return concept.complexity === 'basic';
      if (skillLevel === 'intermediate') return ['basic', 'intermediate'].includes(concept.complexity);
      return true; // advanced 包含所有级别
    });
    
    const learningItems = this.convertToLearningItems(filteredConcepts);
    
    // 加载用户历史数据
    const userRecords = await this.loadUserProgrammingRecords(userId);
    const userSessions = await this.loadUserSessions(userId);
    
    // 创建个性化会话
    const session = await this.memoryManager.createLearningSession(
      userId,
      learningItems,
      userRecords,
      userSessions,
      {
        maxItems: Math.min(8, learningItems.length), // 编程概念较复杂，减少数量
        targetDuration: sessionDuration,
        difficultyRange: this.getDifficultyRange(skillLevel)
      }
    );
    
    console.log(`📚 编程训练会话创建成功:`);
    console.log(`   - 学习概念: ${session.items.length} 个`);
    console.log(`   - 预计时长: ${session.targetDuration / 60} 分钟`);
    
    return session;
  }
  
  private getDifficultyRange(level: string) {
    const ranges = {
      'basic': { min: 0.1, max: 0.4 },
      'intermediate': { min: 0.3, max: 0.7 },
      'advanced': { min: 0.6, max: 0.9 }
    };
    return ranges[level as keyof typeof ranges];
  }
  
  async conductCodeChallenge(
    sessionId: string,
    conceptId: string,
    challengeType: 'explanation' | 'implementation' | 'debugging' | 'optimization' | 'analysis',
    userCode: string,
    startTime: number
  ) {
    const responseTime = Date.now() - startTime;
    
    // 获取概念信息
    const concept = this.conceptDatabase.find(c => c.id === conceptId);
    if (!concept) throw new Error('Concept not found');
    
    // 评估用户代码
    const evaluation = await this.evaluateCode(concept, challengeType, userCode);
    
    // 处理学习响应
    const result = await this.memoryManager.processStudyResponse(
      sessionId,
      conceptId,
      evaluation.response,
      responseTime,
      evaluation.confidence
    );
    
    // 生成详细反馈
    const feedback = this.generateCodeFeedback(concept, challengeType, userCode, evaluation);
    
    return {
      ...result,
      feedback,
      codeAnalysis: evaluation.analysis,
      suggestions: evaluation.suggestions,
      referenceCode: concept.code,
      keyPoints: concept.keyPoints,
      commonMistakes: concept.commonMistakes,
      optimizationTips: concept.optimizationTips
    };
  }
  
  private async evaluateCode(
    concept: ProgrammingConcept,
    challengeType: string,
    userCode: string
  ): Promise<{
    response: 'again' | 'hard' | 'good' | 'easy';
    confidence: number;
    analysis: string;
    suggestions: string[];
  }> {
    
    switch (challengeType) {
      case 'explanation':
        return this.evaluateExplanation(concept, userCode);
      case 'implementation':
        return this.evaluateImplementation(concept, userCode);
      case 'debugging':
        return this.evaluateDebugging(concept, userCode);
      case 'optimization':
        return this.evaluateOptimization(concept, userCode);
      case 'analysis':
        return this.evaluateAnalysis(concept, userCode);
      default:
        return {
          response: 'again',
          confidence: 0,
          analysis: '未知的挑战类型',
          suggestions: []
        };
    }
  }
  
  private evaluateExplanation(concept: ProgrammingConcept, explanation: string): any {
    const keyTerms = this.extractKeyTerms(concept);
    const userTerms = explanation.toLowerCase().split(/\s+/);
    
    const matchedTerms = keyTerms.filter(term => 
      userTerms.some(userTerm => userTerm.includes(term) || term.includes(userTerm))
    );
    
    const matchRatio = matchedTerms.length / keyTerms.length;
    const explanationLength = explanation.split(/\s+/).length;
    
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    let analysis: string;
    let suggestions: string[] = [];
    
    if (matchRatio >= 0.8 && explanationLength >= 20) {
      response = 'easy';
      confidence = 0.9;
      analysis = '优秀的解释！你很好地理解了核心概念。';
    } else if (matchRatio >= 0.6 && explanationLength >= 15) {
      response = 'good';
      confidence = 0.75;
      analysis = '不错的解释，涵盖了主要概念。';
      suggestions.push('可以更详细地解释实现细节');
    } else if (matchRatio >= 0.4) {
      response = 'hard';
      confidence = 0.5;
      analysis = '基本理解了概念，但还需要更深入。';
      suggestions.push('重点关注核心算法步骤');
      suggestions.push('可以结合具体例子来解释');
    } else {
      response = 'again';
      confidence = 0.3;
      analysis = '需要重新学习这个概念。';
      suggestions.push('建议先复习基础知识');
      suggestions.push('可以参考标准实现');
    }
    
    return { response, confidence, analysis, suggestions };
  }
  
  private evaluateImplementation(concept: ProgrammingConcept, userCode: string): any {
    const codeMetrics = this.analyzeCodeMetrics(userCode);
    const hasCorrectStructure = this.checkCodeStructure(concept, userCode);
    const hasCorrectLogic = this.checkCodeLogic(concept, userCode);
    const followsBestPractices = this.checkBestPractices(userCode);
    
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    let analysis: string;
    let suggestions: string[] = [];
    
    if (hasCorrectStructure && hasCorrectLogic && followsBestPractices && codeMetrics.quality >= 0.8) {
      response = 'easy';
      confidence = 0.9;
      analysis = '完美的实现！代码结构清晰，逻辑正确，遵循最佳实践。';
    } else if (hasCorrectStructure && hasCorrectLogic) {
      response = 'good';
      confidence = 0.75;
      analysis = '实现正确，代码质量良好。';
      if (codeMetrics.quality < 0.8) {
        suggestions.push('可以优化代码风格和命名');
      }
      if (!followsBestPractices) {
        suggestions.push('建议遵循编程最佳实践');
      }
    } else if (hasCorrectStructure || hasCorrectLogic) {
      response = 'hard';
      confidence = 0.5;
      analysis = '部分实现正确，但还有改进空间。';
      if (!hasCorrectStructure) suggestions.push('检查代码结构和组织');
      if (!hasCorrectLogic) suggestions.push('重新审查算法逻辑');
    } else {
      response = 'again';
      confidence = 0.3;
      analysis = '实现存在较多问题，需要重新编写。';
      suggestions.push('参考标准实现');
      suggestions.push('逐步调试代码');
    }
    
    return { response, confidence, analysis, suggestions };
  }
  
  private evaluateAnalysis(concept: ProgrammingConcept, analysis: string): any {
    const analysisKeywords = ['复杂度', '时间', '空间', '效率', '性能', '优化'];
    const hasComplexityAnalysis = analysisKeywords.some(keyword => 
      analysis.includes(keyword)
    );
    
    const mentionsKeyPoints = concept.keyPoints.some(point => 
      analysis.includes(point.substring(0, 5))
    );
    
    const analysisLength = analysis.split(/\s+/).length;
    
    let response: 'again' | 'hard' | 'good' | 'easy';
    let confidence: number;
    
    if (hasComplexityAnalysis && mentionsKeyPoints && analysisLength >= 30) {
      response = 'easy';
      confidence = 0.9;
    } else if (hasComplexityAnalysis && analysisLength >= 20) {
      response = 'good';
      confidence = 0.75;
    } else if (mentionsKeyPoints || analysisLength >= 15) {
      response = 'hard';
      confidence = 0.5;
    } else {
      response = 'again';
      confidence = 0.3;
    }
    
    return {
      response,
      confidence,
      analysis: `分析评估：${hasComplexityAnalysis ? '包含' : '缺少'}复杂度分析，${mentionsKeyPoints ? '涉及' : '未涉及'}关键要点`,
      suggestions: []
    };
  }
  
  private analyzeCodeMetrics(code: string): { quality: number; lines: number; complexity: number } {
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    
    // 简化的代码质量评估
    let quality = 0.5;
    
    // 检查命名规范
    if (/[a-zA-Z][a-zA-Z0-9]*/.test(code)) quality += 0.1;
    
    // 检查注释
    if (code.includes('//') || code.includes('/*')) quality += 0.1;
    
    // 检查缩进
    if (/^\s+/.test(code)) quality += 0.1;
    
    // 检查函数分解
    if ((code.match(/function|=>/g) || []).length > 1) quality += 0.1;
    
    // 检查错误处理
    if (code.includes('try') || code.includes('if')) quality += 0.1;
    
    const complexity = Math.min(lines / 10, 1); // 简化的复杂度计算
    
    return { quality: Math.min(quality, 1), lines, complexity };
  }
  
  private checkBestPractices(code: string): boolean {
    const practices = [
      /const|let/, // 使用现代变量声明
      /===/, // 使用严格相等
      /\w+\s*\(/, // 函数调用
      /\/\/|\/\*/ // 包含注释
    ];
    
    return practices.filter(pattern => pattern.test(code)).length >= 2;
  }
  
  // 其他辅助方法...
  private extractKeyTerms(concept: ProgrammingConcept): string[] {
    const terms = [
      concept.title.toLowerCase(),
      ...concept.description.toLowerCase().split(/\s+/).filter(word => word.length > 4),
      concept.category,
      concept.complexity,
      ...concept.keyPoints.join(' ').toLowerCase().split(/\s+/).filter(word => word.length > 3)
    ];
    
    return [...new Set(terms)].filter(term => term.length > 2).slice(0, 10);
  }
  
  private checkCodeStructure(concept: ProgrammingConcept, userCode: string): boolean {
    const requiredElements = [];
    
    if (concept.category === 'algorithm') {
      requiredElements.push('function', 'return');
    }
    
    if (concept.category === 'data_structure') {
      requiredElements.push('class', 'constructor');
    }
    
    return requiredElements.every(element => userCode.includes(element));
  }
  
  private checkCodeLogic(concept: ProgrammingConcept, userCode: string): boolean {
    switch (concept.id) {
      case 'binary_search':
        return userCode.includes('while') && userCode.includes('mid') && 
               userCode.includes('left') && userCode.includes('right');
      case 'linked_list':
        return userCode.includes('next') && userCode.includes('node');
      case 'quicksort':
        return userCode.includes('partition') && userCode.includes('pivot');
      case 'observer_pattern':
        return userCode.includes('subscribe') && userCode.includes('notify');
      default:
        return true;
    }
  }
  
  // 模拟数据加载方法
  private async loadUserProgrammingRecords(userId: string): Promise<StudyRecord[]> {
    return [];
  }
  
  private async loadUserSessions(userId: string): Promise<StudySession[]> {
    return [];
  }
}
```

## 🚀 使用示例

### 基础使用

```typescript
// 创建编程训练系统
const trainer = new ProgrammingSkillTrainer();

// 创建训练会话
const session = await trainer.createProgrammingSession(
  'developer-001',
  'algorithm',
  'intermediate',
  1800
);

// 进行代码挑战
const result = await trainer.conductCodeChallenge(
  session.sessionId,
  'binary_search',
  'implementation',
  userCode,
  startTime
);

console.log('评估结果:', result.feedback);
console.log('改进建议:', result.suggestions);
```

### 高级功能

```typescript
// 多类型挑战
const challengeTypes = ['explanation', 'implementation', 'optimization', 'analysis'];

for (const type of challengeTypes) {
  const result = await trainer.conductCodeChallenge(
    session.sessionId,
    conceptId,
    type as any,
    userResponse,
    startTime
  );
  
  console.log(`${type} 挑战结果:`, result.analysis);
}

// 生成技能报告
const report = await trainer.generateSkillAssessment('developer-001', 30);
console.log('技能水平:', report.overallSkillLevel);
console.log('学习路径:', report.studyPath);
```

## 📊 特色功能

### 1. 多维度代码评估
- **结构正确性** - 检查代码组织和架构
- **逻辑准确性** - 验证算法实现正确性
- **代码质量** - 评估可读性和维护性
- **最佳实践** - 检查编程规范遵循

### 2. 智能学习路径
- **技能评估** - 多维度能力分析
- **个性化推荐** - 基于当前水平的学习建议
- **进阶规划** - 系统性的技能提升路径

### 3. 实践导向训练
- **理论与实践结合** - 从概念到代码实现
- **调试技能培养** - 错误识别和修复能力
- **性能优化训练** - 代码效率提升技巧

## 🎯 最佳实践

1. **循序渐进** - 从基础概念开始，逐步提高复杂度
2. **实践为主** - 重视代码实现和调试练习
3. **定期复习** - 遵循算法建议的复习计划
4. **项目应用** - 在实际项目中应用学到的概念

---

*通过科学的学习算法，让编程技能提升更系统、更高效！*