import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>正在生成摘要，请稍候...</p>
      <small>这可能需要几秒钟时间</small>
    </div>
  );
};

export default LoadingSpinner;