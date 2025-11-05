import React, { useState, useEffect, useRef } from 'react';
import { Progress, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { CountdownTimerProps } from '@/types/game';

const { Text } = Typography;

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  duration,
  onComplete,
  onTick,
  running,
  size = 'medium',
  showProgress = true
}) => {
  const [remaining, setRemaining] = useState(duration);
  const [previousWarningThreshold, setPreviousWarningThreshold] = useState(10);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 警告阈值配置
  const warningThresholds = [30, 10, 5];
  
  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (!running || remaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (remaining <= 0 && onComplete) {
        onComplete();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const newRemaining = Math.max(0, prev - 100);
        
        // 播放警告音效和触觉反馈
        const currentThreshold = warningThresholds.find(t => t <= prev / 1000 && t > newRemaining / 1000);
        if (currentThreshold && currentThreshold !== previousWarningThreshold) {
          setPreviousWarningThreshold(currentThreshold);
          playCountdownSound();
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
        
        if (onTick) {
          onTick(newRemaining);
        }
        
        if (newRemaining <= 0) {
          playTimeoutSound();
          if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]);
          }
          if (onComplete) {
            onComplete();
          }
        }
        
        return newRemaining;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, remaining, onComplete, onTick, previousWarningThreshold]);

  const playCountdownSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContextRef.current.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    } catch (error) {
      console.warn('Audio play failed:', error);
    }
  };

  const playTimeoutSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (error) {
      console.warn('Audio play failed:', error);
    }
  };

  const getSizeConfig = () => {
    const configs = {
      small: { fontSize: 14, progressSize: 60 },
      medium: { fontSize: 18, progressSize: 80 },
      large: { fontSize: 24, progressSize: 120 }
    };
    return configs[size];
  };

  const getTimeColor = () => {
    const seconds = remaining / 1000;
    if (seconds <= 5) return '#ff4d4f';
    if (seconds <= 10) return '#faad14';
    return '#52c41a';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds.toString().padStart(2, '0');
  };

  const config = getSizeConfig();
  const percentage = (remaining / duration) * 100;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 8
    }}>
      {showProgress && (
        <div style={{ position: 'relative' }}>
          <Progress
            type="circle"
            size={config.progressSize}
            percent={percentage}
            strokeColor={{
              '0%': getTimeColor(),
              '100%': getTimeColor(),
            }}
            format={() => ''}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <ClockCircleOutlined 
              style={{ 
                fontSize: config.fontSize, 
                color: getTimeColor(),
                display: 'block'
              }} 
            />
          </div>
        </div>
      )}
      
      <Text style={{ 
        fontSize: config.fontSize, 
        color: getTimeColor(),
        fontWeight: 'bold',
        fontFamily: 'monospace'
      }}>
        {formatTime(remaining)}
      </Text>
      
      {remaining <= 5000 && (
        <Text style={{ 
          fontSize: 12, 
          color: '#ff4d4f',
          animation: 'pulse 1s infinite'
        }}>
          时间不多了！
        </Text>
      )}
    </div>
  );
};

export default CountdownTimer;