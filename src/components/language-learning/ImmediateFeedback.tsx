import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ImmediateFeedback.css';

// 反馈类型定义
export type FeedbackType = 
  | 'success'    // 答对了
  | 'retry'      // 需要重试
  | 'reveal'     // 翻转卡片
  | 'progress'   // 进度更新
  | 'milestone'  // 里程碑达成
  | 'session-complete'; // 会话完成

export interface FeedbackConfig {
  type: FeedbackType;
  duration?: number;
  intensity?: 'light' | 'medium' | 'strong';
  haptic?: boolean;
  sound?: boolean;
}

export interface ImmediateFeedbackProps {
  trigger: FeedbackConfig | null;
  onComplete?: () => void;
}

// 粒子类
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  opacity: number;

  constructor(x: number, y: number, config: any = {}) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * (config.spread || 10);
    this.vy = (Math.random() - 0.5) * (config.spread || 10) - (config.upward || 2);
    this.life = 0;
    this.maxLife = config.life || 60;
    this.size = config.size || Math.random() * 4 + 2;
    this.color = config.color || '#FFD700';
    this.gravity = config.gravity || 0.1;
    this.opacity = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.life++;
    this.opacity = 1 - (this.life / this.maxLife);
    return this.life < this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 烟花粒子类
class FireworkParticle extends Particle {
  hue: number;
  
  constructor(x: number, y: number, config: any = {}) {
    super(x, y, config);
    this.hue = config.hue || Math.random() * 360;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 3;
    this.gravity = 0.05;
    this.maxLife = 80;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = `hsl(${this.hue}, 70%, 60%)`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `hsl(${this.hue}, 70%, 60%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 星星粒子类
class StarParticle extends Particle {
  angle: number;
  rotationSpeed: number;

  constructor(x: number, y: number, config: any = {}) {
    super(x, y, config);
    this.angle = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2;
    this.gravity = 0.02;
    this.maxLife = 100;
  }

  update() {
    super.update();
    this.angle += this.rotationSpeed;
    return this.life < this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FFD700';
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // 绘制星形
    const spikes = 5;
    const outerRadius = this.size;
    const innerRadius = this.size * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Canvas粒子动效反馈系统组件
 * 基于物理引擎的流畅粒子动画
 */
const ImmediateFeedback: React.FC<ImmediateFeedbackProps> = ({
  trigger,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  // 触觉反馈函数
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'strong' = 'light') => {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: 50,
      medium: [50, 50, 50],
      strong: [100, 50, 100]
    };
    
    navigator.vibrate(patterns[intensity]);
  }, []);

  // 音效反馈函数
  const triggerSound = useCallback((type: FeedbackType) => {
    if (!window.AudioContext) return;
    
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        success: [800, 1000],
        retry: [400, 300],
        reveal: [600, 700],
        progress: [500, 600],
        milestone: [800, 1200, 1000],
        'session-complete': [800, 1000, 1200, 800]
      };
      
      const freq = frequencies[type];
      
      if (Array.isArray(freq)) {
        // 播放和弦
        freq.forEach((f, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.frequency.setValueAtTime(f, audioContext.currentTime);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.05, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          osc.start(audioContext.currentTime + i * 0.1);
          osc.stop(audioContext.currentTime + 0.3 + i * 0.1);
        });
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }, []);

  // 创建粒子效果
  const createParticleEffect = useCallback((type: FeedbackType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    particlesRef.current = [];

    switch (type) {
      case 'success':
        // 金色星星爆炸效果 - 增加粒子数量
        for (let i = 0; i < 35; i++) {
          particlesRef.current.push(new StarParticle(centerX, centerY, {
            spread: 12,
            upward: 4,
            life: 80 + Math.random() * 40,
            size: Math.random() * 4 + 3
          }));
        }
        // 添加额外的星星效果
        setTimeout(() => {
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push(new StarParticle(centerX + (Math.random() - 0.5) * 200, centerY + (Math.random() - 0.5) * 200, {
              spread: 8,
              upward: 3,
              life: 60 + Math.random() * 30,
              size: Math.random() * 3 + 2
            }));
          }
        }, 200);
        break;

      case 'retry':
        // 橙色粒子旋转效果 - 增加粒子数量
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2;
          const distance = 20 + Math.random() * 40;
          particlesRef.current.push(new Particle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            {
              spread: 6,
              upward: 2,
              life: 80,
              size: Math.random() * 4 + 2,
              color: '#FF8C00',
              gravity: 0.08
            }
          ));
        }
        // 添加旋转效果粒子
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push(new Particle(centerX, centerY, {
            spread: 0,
            upward: 0,
            life: 60,
            size: Math.random() * 3 + 1,
            color: '#FFA500',
            gravity: 0.1
          }));
          const particle = particlesRef.current[particlesRef.current.length - 1];
          const angle = (i / 15) * Math.PI * 2;
          particle.vx = Math.cos(angle) * 4;
          particle.vy = Math.sin(angle) * 4;
        }
        break;

      case 'reveal':
        // 蓝色波纹扩散效果
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const speed = 2 + Math.random() * 2;
          particlesRef.current.push(new Particle(centerX, centerY, {
            spread: 0,
            upward: 0,
            life: 40,
            size: Math.random() * 2 + 1,
            color: '#2196F3',
            gravity: 0
          }));
          // 设置放射状运动
          const particle = particlesRef.current[particlesRef.current.length - 1];
          particle.vx = Math.cos(angle) * speed;
          particle.vy = Math.sin(angle) * speed;
        }
        break;

      case 'session-complete':
        // 彩色烟花庆祝效果
        for (let burst = 0; burst < 3; burst++) {
          setTimeout(() => {
            const burstX = centerX + (Math.random() - 0.5) * 200;
            const burstY = centerY + (Math.random() - 0.5) * 100;
            
            for (let i = 0; i < 25; i++) {
              particlesRef.current.push(new FireworkParticle(burstX, burstY, {
                hue: Math.random() * 360,
                life: 100 + Math.random() * 50,
                size: Math.random() * 4 + 1
              }));
            }
          }, burst * 200);
        }
        break;

      case 'milestone':
        // 金色喷泉效果
        for (let i = 0; i < 30; i++) {
          particlesRef.current.push(new Particle(centerX, centerY + 20, {
            spread: 6,
            upward: 5 + Math.random() * 3,
            life: 80 + Math.random() * 40,
            size: Math.random() * 3 + 1,
            color: '#FFD700',
            gravity: 0.08
          }));
        }
        break;

      default:
        break;
    }
  }, []);

  // 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制粒子
    particlesRef.current = particlesRef.current.filter(particle => {
      const alive = particle.update();
      if (alive) {
        particle.draw(ctx);
      }
      return alive;
    });

    // 如果还有粒子，继续动画
    if (particlesRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  }, [onComplete]);

  // 处理触发器
  useEffect(() => {
    console.log('ImmediateFeedback trigger:', trigger);
    if (!trigger) return;

    // 延迟执行，确保Canvas已经挂载
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas not found after timeout');
        return;
      }

      console.log('Starting feedback animation:', trigger.type);
      setIsActive(true);

      // 设置画布尺寸
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log('Canvas size:', canvas.width, 'x', canvas.height);

      // 触觉反馈
      if (trigger.haptic) {
        triggerHaptic(trigger.intensity);
      }

      // 音效反馈
      if (trigger.sound) {
        triggerSound(trigger.type);
      }

      // 创建粒子效果
      createParticleEffect(trigger.type);
      console.log('Particles created:', particlesRef.current.length);

      // 开始动画
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 10); // 短暂延迟确保DOM已渲染

    // 清理函数
    return () => {
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trigger, triggerHaptic, triggerSound, createParticleEffect, animate]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!trigger && !isActive) return null;

  return (
    <div className="particle-feedback-overlay">
      <canvas
        ref={canvasRef}
        className="particle-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 10002,
          display: isActive ? 'block' : 'none'
        }}
      />
    </div>
  );
};

// Hook for easier usage
export const useImmediateFeedback = () => {
  const [feedbackTrigger, setFeedbackTrigger] = useState<FeedbackConfig | null>(null);

  const triggerFeedback = useCallback((config: FeedbackConfig) => {
    console.log('triggerFeedback called with:', config);
    setFeedbackTrigger(config);
  }, []);

  const clearFeedback = useCallback(() => {
    console.log('clearFeedback called');
    setFeedbackTrigger(null);
  }, []);

  return {
    feedbackTrigger,
    triggerFeedback,
    clearFeedback
  };
};

export default ImmediateFeedback;