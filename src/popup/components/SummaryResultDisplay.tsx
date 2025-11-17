import React, { useState } from 'react';
import { SummaryResult } from '../../types';

interface SummaryResultDisplayProps {
  result: SummaryResult;
  onClear: () => void;
}

const SummaryResultDisplay: React.FC<SummaryResultDisplayProps> = ({ result, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="summary-result">
      <div className="result-header">
        <h3>视频摘要</h3>
        <div className="result-actions">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
          <button
            className="clear-btn"
            onClick={onClear}
            title="清除结果"
          >
            🗑️
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="result-content">
          <div className="overall-summary">
            <h4>📋 整体摘要</h4>
            <p>{result.overall}</p>
          </div>

          {result.segments.length > 0 && (
            <div className="segments-summary">
              <h4>⏰ 分段分析</h4>
              {result.segments.map((segment: any, index: number) => (
                <div key={index} className="segment">
                  <div className="segment-time">
                    <strong>{segment.startTime} - {segment.endTime}</strong>
                  </div>
                  <div className="segment-content">
                    <p>{segment.content}</p>
                    {segment.keyPoints.length > 0 && (
                      <div className="key-points">
                        <strong>要点：</strong>
                        <ul>
                          {segment.keyPoints.map((point: string, pointIndex: number) => (
                            <li key={pointIndex}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="result-timestamp">
            <small>生成时间: {new Date(result.timestamp).toLocaleString()}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryResultDisplay;