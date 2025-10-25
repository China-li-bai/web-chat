import { useState, useRef, useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { Modal } from 'antd';
import { invoke } from '@tauri-apps/api/core';

/** Options to configure the microphone hook */
export interface UseMicrophoneOptions {
  /** MIME type for the recorded audio blob (default: 'audio/wav') */
  mimeType?: string;
}

/** Return type of the microphone hook */
export interface UseMicrophoneReturn {
  micPermission: boolean;
  requestMicrophonePermission: () => Promise<boolean>;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  recordedAudioUrl: string | null;
  audioBlob: Blob | null;
  isPlaying: boolean;
  playRecording: () => void;
  pauseRecording: () => void;
  togglePlayback: () => void;
  resetRecording: () => void;
  audioRef: RefObject<HTMLAudioElement>;
}

/** Utility: detect Tauri environment */
function isTauriApp(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI__;
}

/**
 * Microphone hook: encapsulates microphone permission, recording, playback/pause, and reset.
 * Usage:
 * const {
 *   micPermission, requestMicrophonePermission,
 *   isRecording, startRecording, stopRecording,
 *   recordedAudioUrl, audioBlob,
 *   isPlaying, playRecording, pauseRecording, togglePlayback,
 *   resetRecording, audioRef,
 * } = useMicrophone();
 */
export default function useMicrophone(options: UseMicrophoneOptions = {}): UseMicrophoneReturn {
  const { mimeType = 'audio/wav' } = options;

  const [micPermission, setMicPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef: MutableRefObject<MediaRecorder | null> = useRef<MediaRecorder | null>(null);
  const audioChunksRef: MutableRefObject<Blob[]> = useRef<Blob[]>([]);
  const audioRef: RefObject<HTMLAudioElement> = useRef<HTMLAudioElement>(null);

  const requestMicrophonePermission = async (): Promise<boolean> => {
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

  const startRecording = async (): Promise<void> => {
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
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      recorder.start();
      setIsRecording(true);
      console.log('录音开始');

      if (isTauriApp()) {
        try {
          await invoke('start_recording');
        } catch (e) {
          console.warn('Tauri start_recording 調用失敗，忽略：', e);
        }
      }
    } catch (error: any) {
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

  const stopRecording = async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (recorder && isRecording) {
      recorder.stop();
      // 停止所有音轨
      try {
        recorder.stream.getTracks().forEach((track) => track.stop());
      } catch {}
      setIsRecording(false);

      if (isTauriApp()) {
        try {
          await invoke('stop_recording');
        } catch (e) {
          console.warn('Tauri stop_recording 調用失敗，忽略：', e);
        }
      }

      // 等待 onstop 生成 blob
      return new Promise<Blob | null>((resolve) => {
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

  const playRecording = (): void => {
    const audioEl = audioRef.current;
    if (recordedAudioUrl && audioEl) {
      audioEl.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = (): void => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      setIsPlaying(false);
    }
  };

  const togglePlayback = (): void => {
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

  const resetRecording = (): void => {
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && isRecording) {
        recorder.stop();
        try { recorder.stream.getTracks().forEach((track) => track.stop()); } catch {}
      }
    } catch {
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