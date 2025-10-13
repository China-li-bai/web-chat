import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 你可以将错误日志上报给服务器
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI 并渲染
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <Result
          status="error"
          title="学习会话出错"
          subTitle="抱歉，学习会话遇到了一个错误。"
          extra={[
            <Button type="primary" onClick={this.handleReset} key="retry">
              重试
            </Button>,
            <Button onClick={() => window.location.href = '/language-learning'} key="home">
              返回词书列表
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;