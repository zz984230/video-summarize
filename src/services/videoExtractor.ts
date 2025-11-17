import { VideoInfo } from '../types';

export class VideoExtractor {
  static extractVideoInfo(location: Location = window.location): VideoInfo | null {
    try {
      const url = location.href;
      
      // 检查是否为B站视频页面
      if (!this.isBilibiliVideoPage(url)) {
        return null;
      }

      const videoInfo: VideoInfo = {
        url: this.cleanUrl(url),
        title: this.extractTitle(),
        duration: this.extractDuration(),
        cover: this.extractCover(),
        bvid: this.extractBvid(location),
        cid: this.extractCid(location)
      };

      return videoInfo;
    } catch (error) {
      console.error('提取视频信息失败:', error);
      return null;
    }
  }

  private static isBilibiliVideoPage(url: string): boolean {
    const patterns = [
      /https?:\/\/www\.bilibili\.com\/video\/\w+/,
      /https?:\/\/www\.bilibili\.com\/bangumi\/play\/\w+/,
      /https?:\/\/live\.bilibili\.com\/record\/\w+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  private static cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除不必要的参数
      const paramsToKeep = ['p', 't', 'bvid', 'cid'];
      const searchParams = new URLSearchParams();
      
      paramsToKeep.forEach(param => {
        const value = urlObj.searchParams.get(param);
        if (value) {
          searchParams.set(param, value);
        }
      });

      urlObj.search = searchParams.toString();
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  private static extractTitle(): string {
    // 尝试多种方式获取标题
    const selectors = [
      'h1.video-title',
      '.video-title',
      'title',
      '[data-title]',
      'meta[property="og:title"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const title = element.getAttribute('content') || element.textContent || '';
        if (title) {
          return title.trim().replace(/_哔哩哔哩.*$/i, '');
        }
      }
    }

    return '未知标题';
  }

  private static extractDuration(): number | undefined {
    try {
      // 尝试从页面元素获取时长
      const durationElement = document.querySelector('.duration, .video-duration, [data-duration]');
      if (durationElement) {
        const durationText = durationElement.textContent || '';
        return this.parseDuration(durationText);
      }

      // 尝试从window对象获取
      if ((window as any).__INITIAL_STATE__?.videoData?.duration) {
        return (window as any).__INITIAL_STATE__.videoData.duration;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private static parseDuration(durationText: string): number {
    // 解析时长格式如 "12:34" 或 "1:23:45"
    const parts = durationText.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  private static extractCover(): string | undefined {
    try {
      // 尝试获取封面图片
      const coverElement = document.querySelector('meta[property="og:image"]');
      if (coverElement) {
        return coverElement.getAttribute('content') || undefined;
      }

      // 尝试从window对象获取
      if ((window as any).__INITIAL_STATE__?.videoData?.pic) {
        return (window as any).__INITIAL_STATE__.videoData.pic;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private static extractBvid(location: Location = window.location): string | undefined {
    try {
      // 从URL中提取bvid
      const match = location.href.match(/\/video\/(\w+)/);
      if (match) {
        return match[1];
      }

      // 从window对象获取
      if ((window as any).__INITIAL_STATE__?.bvid) {
        return (window as any).__INITIAL_STATE__.bvid;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private static extractCid(location: Location = window.location): string | undefined {
    try {
      // 从URL参数获取
      const urlParams = new URLSearchParams(location.search);
      const cid = urlParams.get('cid');
      if (cid) {
        return cid;
      }

      // 从window对象获取
      if ((window as any).__INITIAL_STATE__?.videoData?.cid) {
        return (window as any).__INITIAL_STATE__.videoData.cid;
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}