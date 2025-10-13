// QTS 前端可调参数（编辑本文件即可热调，保存后立即生效）
export type QtsTunables = {
  retrievability: { low: number; medium: number };
  fatigue: { baseRT: number; highRT: number; rtWeight: number; accWeight: number };
  difficultyTarget: { lowAcc: number; fastRT: number; highAcc: number };
  adjust: { choiceBoostPerFatigue: number; spellingPenaltyPerFatigue: number; minSpellingWeight: number };
  fallback: { baselineRollbackOdds_16: number }; // 以16分之一为单位的回退概率
};

export const qtsTunables: QtsTunables = {
  // 检索性阈值：低/中（>=medium 视为高）
  retrievability: { low: 0.6, medium: 0.85 },

  // 疲劳映射：以 baseRT 为适中基准，highRT 接近高负荷；两者差值决定归一化分母
  // rtWeight: 反应时在疲劳计算中的权重；accWeight: 准确率在疲劳计算中的权重
  fatigue: { baseRT: 900, highRT: 2400, rtWeight: 0.6, accWeight: 0.4 },

  // 难度目标推断：低准确率触发 easy；快速反应且高准确率触发 hard；其它为 medium
  difficultyTarget: { lowAcc: 0.65, fastRT: 1200, highAcc: 0.85 },

  // 自适应题型调权：疲劳越高越偏好 choice；对 spelling 做最小权重保护
  adjust: { choiceBoostPerFatigue: 0.15, spellingPenaltyPerFatigue: 0.10, minSpellingWeight: 0.05 },

  // 稳定选择与小概率回退基线（3/16 ≈ 18.75%）
  fallback: { baselineRollbackOdds_16: 3 }
};

export default qtsTunables;