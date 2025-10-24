import { useState, useRef, useEffect } from 'react';
import { Modal } from 'antd';
import { invoke } from '@tauri-apps/api/core';

// 自定義 Hook：封裝麥克風權限、錄音、播放/暫停、重置等功能
// 使用方式：
// const {
//   micPermission, requestMicrophonePermission,
//   isRecording, startRecording, stopRecording,
//   recordedAudioUrl, audioBlob,
//   isPlaying, playRecording, pauseRecording, togglePlayback,
//   resetRecording, audioRef,
// } = useMicrophone();
export default function useMicrophone() {
  const [micPermission, setMicPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const isTauriApp = () => typeof window !== 'undefined' && window.__TAURI__;

  const requestMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices 不可用');
        Modal.error({
          title: '麦克风权限',
          content: '在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 获取权限后立即释放资源
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission(true);
      console.log('麦克风权限已获取');
      return true;
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      Modal.error({
        title: '麦克风权限',
        content: '无法访问麦克风，请在系统设置中允许此应用访问麦克风，然后重启应用。',
      });
      return false;
    }
  };

  const startRecording = async () => {
    // 若尚未授權，先嘗試申請權限
    if (!micPermission) {
      const ok = await requestMicrophonePermission();
      if (!ok) return;
    }

    try {
      if (!navigator.mediaDevices) {
        console.error('navigator.mediaDevices 不可用');
        Modal.error({
          title: '麦克风权限',
          content: '在 Tauri 应用中，麦克风权限需要在系统级别授予。请确保您已在系统设置中允许此应用访问麦克风，然后重启应用。',
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('录音开始');

      if (isTauriApp()) {
        try {
          await invoke('start_recording');
        } catch (e) {
          console.warn('Tauri start_recording 調用失敗，忽略：', e);
        }
      }
    } catch (error) {
      console.error('录音失败:', error);
      let errorMessage = '无法访问麦克风，请检查权限设置。';

      if (error && error.name === 'NotAllowedError') {
        errorMessage = '麦克风权限被拒绝。请在浏览器地址栏左侧点击锁图标，允许麦克风权限后重试。';
      } else if (error && error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备，请检查设备连接。';
      } else if (error && error.name === 'NotSupportedError') {
        errorMessage = '当前浏览器不支持录音功能，建议使用Chrome或Firefox浏览器。';
      }

      Modal.error({ title: '录音失败', content: errorMessage });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      if (isTauriApp()) {
        try {
          await invoke('stop_recording');
        } catch (e) {
          console.warn('Tauri stop_recording 調用失敗，忽略：', e);
        }
      }

      // 等待 onstop 生成 blob
      return new Promise((resolve) => {
        const check = () => {
          if (audioBlob) {
            resolve(audioBlob);
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }
    return null;
  };

  const playRecording = () => {
    const audioEl = audioRef.current;
    if (recordedAudioUrl && audioEl) {
      audioEl.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (isPlaying) {
      pauseRecording();
    } else {
      playRecording();
    }
  };

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handler = () => setIsPlaying(false);
    audioEl.addEventListener('ended', handler);
    return () => audioEl.removeEventListener('ended', handler);
  }, [audioRef]);

  const resetRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      // 忽略
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordedAudioUrl(null);
    setIsPlaying(false);
    audioChunksRef.current = [];
  };

  return {
    micPermission,
    requestMicrophonePermission,
    isRecording,
    startRecording,
    stopRecording,
    recordedAudioUrl,
    audioBlob,
    isPlaying,
    playRecording,
    pauseRecording,
    togglePlayback,
    resetRecording,
    audioRef,
  };
}