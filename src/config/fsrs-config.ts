// FSRS 前端可调配置（热调）。若需后端远程调参，可再外提。
// A/B 开关与队列权重、新词比例
export interface FsrsConfig {
  enabled: boolean; // 全局开关
  // due 权重与过期加成
  due: {
    baseWeight: number;   // 到期卡基础权重
    overdueBoostPerHour: number; // 过期每小时加成（线性），防止拖延
    maxBoost: number;     // 过期加成上限
  };
  // 新词与复习比例（会在 session 计数基础上动态调整）
  ratio: {
    dailyNewTarget: number;   // 每日新词目标
    minNewRatio: number;      // 最小新词比例
    maxNewRatio: number;      // 最大新词比例
  };
  // 多队列权重（复习/学习中/新词）
  queues: {
    review: number;
    learning: number;
    new: number;
  };
  // 稳定性剪裁，避免极端值
  clip: {
    minStability: number;
    maxStability: number;
  };
  // 调试
  debug: boolean;
}

const fsrsConfig: FsrsConfig = {
  enabled: true,
  due: { baseWeight: 1.0, overdueBoostPerHour: 0.15, maxBoost: 2.5 },
  ratio: { dailyNewTarget: 30, minNewRatio: 0.2, maxNewRatio: 0.5 },
  queues: { review: 1.0, learning: 0.7, new: 0.6 },
  clip: { minStability: 1, maxStability: 365 },
  debug: true
};

export default fsrsConfig;