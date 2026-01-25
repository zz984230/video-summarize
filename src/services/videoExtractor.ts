import { VideoInfo } from '../types';

// B站视频解析器类（基于 test_bilibili_parser.js 的实现）
export class BilibiliVideoParser {
  private baseApiUrl = 'https://api.bilibili.com/x/web-interface/view';
  private playUrlApi = 'https://api.bilibili.com/x/player/playurl';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com'
  };

  /**
   * 从B站视频链接中提取BV号
   * @param url - B站视频链接
   * @returns BV号
   */
  extractBV(url: string): string {
    const patterns = [
      /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
      /b23\.tv\/([a-zA-Z0-9]+)/,
      /BV([a-zA-Z0-9]{10})/
    ];
    
    for (let pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1].startsWith('BV') ? match[1] : `BV${match[1]}`;
      }
    }
    throw new Error('无法从链接中提取BV号');
  }

  /**
   * 获取视频基本信息（aid, cid等）
   * @param bvid - BV号
   * @returns 视频信息
   */
  async getVideoInfo(bvid: string): Promise<any> {
    try {
      console.log(`正在获取视频基本信息，BV号: ${bvid}`);
      const response = await fetch(`${this.baseApiUrl}?bvid=${bvid}`, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`API返回错误: ${data.message}`);
      }
      
      console.log(`✅ 视频信息获取成功: ${data.data.title}`);
      return {
        aid: data.data.aid,
        title: data.data.title,
        pages: data.data.pages.map((page: any) => ({
          cid: page.cid,
          part: page.part,
          title: page.part
        })),
        owner: data.data.owner.name,
        duration: data.data.duration,
        view: data.data.stat.view
      };
    } catch (error) {
      console.error('❌ 获取视频信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取MP4/FLV视频播放地址（非DASH格式）
   * @param aid - 视频aid
   * @param cid - 视频cid
   * @param qn - 视频质量
   * @returns MP4/FLV下载地址
   */
  async getVideoUrls(aid: number, cid: number, qn = 64): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        avid: aid.toString(),
        cid: cid.toString(),
        qn: qn.toString(),
        type: '',
        otype: 'json',
        fourk: '0',
        fnver: '0',
        fnval: '0',
        platform: 'html5',
        high_quality: '0'
      });
      
      console.log(`正在获取播放地址，aid: ${aid}, cid: ${cid}, 质量: ${qn}`);
      const response = await fetch(`${this.playUrlApi}?${params}`, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`播放地址API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`播放地址API返回错误: ${data.message}`);
      }
      
      console.log(`✅ 播放地址获取成功`);
      
      if (data.data.durl) {
        return data.data.durl.map((item: any) => ({
          url: item.url,
          size: item.size,
          length: item.length,
          type: 'mp4/flv'
        }));
      }
      
      throw new Error('无法识别的视频格式');
    } catch (error) {
      console.error('❌ 获取视频地址失败:', error);
      throw error;
    }
  }

  /**
   * 主解析函数（仅支持MP4/FLV格式）
   * @param inputUrl - 用户输入的B站视频链接
   * @param quality - 视频质量选项（默认720P）
   * @returns 解析结果
   */
  async parseVideo(inputUrl: string, quality = 64): Promise<any> {
    try {
      console.log('🚀 开始解析视频链接:', inputUrl);
      console.log('📋 格式选项: MP4/FLV格式');
      
      const bvid = this.extractBV(inputUrl);
      console.log('📹 提取到BV号:', bvid);
      
      const videoInfo = await this.getVideoInfo(bvid);
      
      let allUrls = [];
      
      if (videoInfo.pages.length > 1) {
        console.log(`📝 检测到多P视频，共${videoInfo.pages.length}P`);
        for (let i = 0; i < videoInfo.pages.length; i++) {
          const page = videoInfo.pages[i];
          console.log(`⏳ 正在获取第${i + 1}P地址: ${page.title}`);
          
          const urls = await this.getVideoUrls(videoInfo.aid, page.cid, quality > 64 ? 64 : quality);
          
          allUrls.push({
            page: i + 1,
            title: page.title,
            cid: page.cid,
            urls: urls,
            format: 'mp4'
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        console.log('📝 单P视频，直接获取地址');
        const urls = await this.getVideoUrls(videoInfo.aid, videoInfo.pages[0].cid, quality > 64 ? 64 : quality);
        
        allUrls.push({
          page: 1,
          title: videoInfo.title,
          cid: videoInfo.pages[0].cid,
          urls: urls,
          format: 'mp4'
        });
      }
      
      return {
        success: true,
        videoInfo: {
          title: videoInfo.title,
          owner: videoInfo.owner,
          duration: videoInfo.duration,
          view: videoInfo.view,
          pages: videoInfo.pages.length
        },
        downloadUrls: allUrls,
        format: 'mp4'
      };
      
    } catch (error) {
      console.error('❌ 视频解析失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

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

  /**
   * 使用BilibiliVideoParser获取增强的视频信息（包括视频下载地址）
   * @param location - 当前页面位置
   * @returns 增强的视频信息，包含解析结果
   */
  static async extractEnhancedVideoInfo(videoInfoOrLocation: VideoInfo | Location | null): Promise<{
    videoInfo: VideoInfo | null;
    parseResult: any | null;
  }> {
    try {
      let videoInfo: VideoInfo | null = null;
      let location: Location;
      
      // 根据参数类型决定如何处理
      if (!videoInfoOrLocation) {
        // 参数为 null，使用当前页面位置
        location = window.location;
      } else if ('url' in videoInfoOrLocation) {
        // 参数是 VideoInfo 对象
        videoInfo = videoInfoOrLocation as VideoInfo;
        location = window.location;
      } else {
        // 参数是 Location 对象
        location = videoInfoOrLocation as Location;
      }

      const url = location.href;
      
      // 检查是否为B站视频页面
      if (!this.isBilibiliVideoPage(url)) {
        return { videoInfo: null, parseResult: null };
      }

      // 如果没有提供 videoInfo，则尝试提取
      if (!videoInfo) {
        videoInfo = {
          url: this.cleanUrl(url),
          title: this.extractTitle(),
          duration: this.extractDuration(),
          cover: this.extractCover(),
          bvid: this.extractBvid(location),
          cid: this.extractCid(location)
        };
      }

      // 使用BilibiliVideoParser获取增强信息
      const parser = new BilibiliVideoParser();
      const parseResult = await parser.parseVideo(videoInfo.url, 64); // 720P质量

      if (parseResult.success) {
        // 更新视频信息，使用解析器返回的更准确信息
        videoInfo.title = parseResult.videoInfo.title;
        videoInfo.duration = parseResult.videoInfo.duration;
      }

      return { videoInfo, parseResult };
    } catch (error) {
      console.error('提取增强视频信息失败:', error);
      return { videoInfo: null, parseResult: null };
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
      const initial = (window as any).__INITIAL_STATE__;
      if (initial?.videoData?.cid) {
        return String(initial.videoData.cid);
      }

      // 兼容多分P：从 pages 中选择对应分P的 cid
      if (initial?.videoData?.pages && Array.isArray(initial.videoData.pages)) {
        const pParam = urlParams.get('p');
        const index = Math.max(0, (pParam ? parseInt(pParam, 10) : 1) - 1);
        const page = initial.videoData.pages[index] || initial.videoData.pages[0];
        if (page?.cid) {
          return String(page.cid);
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}