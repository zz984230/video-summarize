import React from 'react';
import { VideoInfo } from '../../types';

interface VideoInfoDisplayProps {
  videoInfo: VideoInfo | null;
}

const VideoInfoDisplay: React.FC<VideoInfoDisplayProps> = ({ videoInfo }) => {
  if (!videoInfo) {
    return (
      <div className="video-info">
        <div className="no-video">
          <p>🎬</p>
          <p>当前页面不是B站视频页面</p>
          <small>请打开B站视频页面后重试</small>
        </div>
      </div>
    );
  }

  return (
    <div className="video-info">
      <div className="video-cover">
        {videoInfo.cover ? (
          <img src={videoInfo.cover} alt={videoInfo.title} />
        ) : (
          <div className="cover-placeholder">🎬</div>
        )}
      </div>
      <div className="video-details">
        <h3 className="video-title">{videoInfo.title}</h3>
        <div className="video-meta">
          {videoInfo.duration && (
            <span className="duration">
              ⏱️ {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
          {videoInfo.bvid && (
            <span className="bvid">BV号: {videoInfo.bvid}</span>
          )}
        </div>
        <div className="video-url">
          <small>{videoInfo.url}</small>
        </div>
      </div>
    </div>
  );
};

export default VideoInfoDisplay;