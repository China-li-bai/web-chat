import React from 'react';
import ImmediateFeedback, { useImmediateFeedback } from '@/components/language-learning/ImmediateFeedback';

const ParticleTest: React.FC = () => {
  const { feedbackTrigger, triggerFeedback, clearFeedback } = useImmediateFeedback();

  const testEffects = [
    { type: 'success', label: '成功效果' },
    { type: 'retry', label: '重试效果' },
    { type: 'reveal', label: '翻转效果' },
    { type: 'session-complete', label: '完成效果' },
    { type: 'milestone', label: '里程碑效果' }
  ];

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }}>
      <h1>粒子动效测试</h1>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {testEffects.map(effect => (
          <button
            key={effect.type}
            onClick={() => triggerFeedback({
              type: effect.type as any,
              haptic: true,
              sound: true,
              intensity: 'medium'
            })}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {effect.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <p>点击按钮测试不同的粒子效果</p>
        <p>当前触发器: {feedbackTrigger ? feedbackTrigger.type : 'null'}</p>
      </div>

      <ImmediateFeedback 
        trigger={feedbackTrigger}
        onComplete={clearFeedback}
      />
    </div>
  );
};

export default ParticleTest;