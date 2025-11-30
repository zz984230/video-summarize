import axios from 'axios';
import { VideoInfo } from '../types';

/**
 * 视频代理服务 - 解决Qwen模型无法访问B站加密链接的问题
 * 通过浏览器缓存和代理，将加密视频流转换为可访问的本地数据URL
 */
export class VideoProxyService {
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB缓存限制
  private static readonly SEGMENT_DURATION = 30; // 30秒片段用于分析
  private static readonly CACHE_PREFIX = 'video_proxy_cache_';
  private static readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24小时缓存有效期
  
  constructor() {
    this.initializeCache();
  }

  /**
   * 初始化缓存系统
   */
  private initializeCache(): void {
    // 清理过期缓存
    this.cleanupExpiredCache();
  }

  /**
   * 获取视频的唯一标识符
   */
  private getVideoId(videoInfo: VideoInfo): string {
    return `${videoInfo.bvid || 'unknown'}_${videoInfo.cid || 'nocid'}`;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(videoId: string, type: 'video' | 'audio' | 'cover'): string {
    return `${VideoProxyService.CACHE_PREFIX}${videoId}_${type}`;
  }

  /**
   * 检查缓存是否存在且有效
   */
  private isCacheValid(cacheKey: string): boolean {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return false;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      const cacheTime = cacheData.timestamp;
      
      return (now - cacheTime) < VideoProxyService.MAX_CACHE_AGE && cacheData.data;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取缓存的数据URL
   */
  private getCacheDataUrl(cacheKey: string): string | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const cacheData = JSON.parse(cached);
      return cacheData.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * 保存数据URL到缓存
   */
  private saveCacheDataUrl(cacheKey: string, dataUrl: string): void {
    try {
      const cacheData = {
        data: dataUrl,
        timestamp: Date.now(),
        size: dataUrl.length
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('缓存保存失败:', error);
    }
  }

  /**
   * 下载视频片段（带B站特定的请求头）
   */
  private async downloadVideoSegment(videoUrl: string, videoId: string, headers: Record<string, string>): Promise<string> {
    const cacheKey = this.getCacheKey(videoId, 'video');
    
    // 如果已缓存且有效，直接返回
    if (this.isCacheValid(cacheKey)) {
      const cachedUrl = this.getCacheDataUrl(cacheKey);
      if (cachedUrl) {
        console.log('✅ 使用缓存的视频片段');
        return cachedUrl;
      }
    }

    console.log('📥 正在下载视频片段:', videoUrl);
    
    try {
      const response = await axios.get(videoUrl, {
        headers,
        responseType: 'arraybuffer', // 改为arraybuffer以获取二进制数据
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // 限制下载大小为50MB
      });

      // 将二进制数据转换为base64
      const base64Data = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      // 检测MIME类型
      const contentType = response.headers['content-type'] || 'video/mp4';
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      
      // 保存到缓存
      this.saveCacheDataUrl(cacheKey, dataUrl);
      
      console.log('✅ 视频片段下载完成');
      return dataUrl;
      
    } catch (error) {
      console.error('❌ 视频片段下载失败:', error);
      throw error;
    }
  }

  /**
   * 下载封面图片
   */
  private async downloadCoverImage(coverUrl: string, videoId: string): Promise<string> {
    const cacheKey = this.getCacheKey(videoId, 'cover');
    
    // 如果已缓存且有效，直接返回
    if (this.isCacheValid(cacheKey)) {
      const cachedUrl = this.getCacheDataUrl(cacheKey);
      if (cachedUrl) {
        console.log('✅ 使用缓存的封面图片');
        return cachedUrl;
      }
    }

    console.log('📥 正在下载封面图片:', coverUrl);
    
    try {
      const response = await axios.get(coverUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com'
        },
        responseType: 'arraybuffer', // 改为arraybuffer以获取二进制数据
        timeout: 10000,
        maxContentLength: 5 * 1024 * 1024, // 限制封面大小为5MB
      });

      // 将二进制数据转换为base64
      const base64Data = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      // 检测MIME类型
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      
      // 保存到缓存
      this.saveCacheDataUrl(cacheKey, dataUrl);
      
      console.log('✅ 封面图片下载完成');
      return dataUrl;
      
    } catch (error) {
      console.error('❌ 封面图片下载失败:', error);
      throw error;
    }
  }

  /**
   * 获取或创建视频代理URL
   */
  async getVideoProxyUrl(videoInfo: VideoInfo, videoUrl: string): Promise<string> {
    try {
      const videoId = this.getVideoId(videoInfo);
      const cacheKey = this.getCacheKey(videoId, 'video');
      
      // 检查缓存
      if (this.isCacheValid(cacheKey)) {
        const cachedUrl = this.getCacheDataUrl(cacheKey);
        if (cachedUrl) {
          console.log('✅ 使用缓存的视频文件');
          return cachedUrl;
        }
      }
      
      console.log('🔄 创建新的视频代理...');
      
      // 下载视频片段
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com',
        'Origin': 'https://www.bilibili.com',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'no-cache',
        'Range': 'bytes=0-10485760' // 限制下载大小，最多10MB
      };
      
      const videoDataUrl = await this.downloadVideoSegment(videoUrl, videoId, headers);
      
      console.log(`✅ 视频代理创建成功`);
      return videoDataUrl;
      
    } catch (error) {
      console.error('❌ 创建视频代理失败:', error);
      
      // 如果代理创建失败，返回一个描述性的错误信息
      throw new Error(`视频代理创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取或创建封面图片代理URL
   */
  async getCoverProxyUrl(videoInfo: VideoInfo): Promise<string> {
    try {
      if (!videoInfo.cover) {
        throw new Error('视频没有封面图片');
      }
      
      const videoId = this.getVideoId(videoInfo);
      const cacheKey = this.getCacheKey(videoId, 'cover');
      
      // 检查缓存
      if (this.isCacheValid(cacheKey)) {
        const cachedUrl = this.getCacheDataUrl(cacheKey);
        if (cachedUrl) {
          console.log('✅ 使用缓存的封面图片');
          return cachedUrl;
        }
      }
      
      console.log('🔄 下载封面图片...');
      
      // 下载封面图片
      const coverDataUrl = await this.downloadCoverImage(videoInfo.cover, videoId);
      
      console.log(`✅ 封面代理创建成功`);
      return coverDataUrl;
      
    } catch (error) {
      console.error('❌ 创建封面代理失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    try {
      const now = Date.now();
      const maxAge = VideoProxyService.MAX_CACHE_AGE;
      
      let cleanedCount = 0;
      let totalSizeFreed = 0;
      
      // 遍历所有localStorage项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(VideoProxyService.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheData = JSON.parse(cached);
              const fileAge = now - cacheData.timestamp;
              
              if (fileAge > maxAge) {
                totalSizeFreed += cacheData.size;
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch (error) {
            console.warn(`清理缓存失败: ${key}`, error);
          }
        }
      }
      
      console.log(`🧹 缓存清理完成: 删除 ${cleanedCount} 个缓存项，释放 ${(totalSizeFreed / 1024 / 1024).toFixed(2)}MB 空间`);
      
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  }

  /**
   * 清理缓存
   */
  cleanupCache(): void {
    this.cleanupExpiredCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { fileCount: number; totalSize: number; directory: string } {
    try {
      let fileCount = 0;
      let totalSize = 0;
      
      // 遍历所有localStorage项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(VideoProxyService.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheData = JSON.parse(cached);
              fileCount++;
              totalSize += cacheData.size;
            }
          } catch (error) {
            // 忽略解析错误的缓存项
          }
        }
      }
      
      return {
        fileCount,
        totalSize,
        directory: 'localStorage'
      };
    } catch (error) {
      return {
        fileCount: 0,
        totalSize: 0,
        directory: 'localStorage'
      };
    }
  }
}

/**
 * 视频代理管理器 - 单例模式
 */
export class VideoProxyManager {
  private static instance: VideoProxyManager;
  private proxyService: VideoProxyService;
  
  private constructor() {
    this.proxyService = new VideoProxyService();
  }
  
  static getInstance(): VideoProxyManager {
    if (!VideoProxyManager.instance) {
      VideoProxyManager.instance = new VideoProxyManager();
    }
    return VideoProxyManager.instance;
  }
  
  /**
   * 为视频信息创建代理URL（智能选择最佳方案）
   */
  async createVideoProxy(videoInfo: VideoInfo, videoUrl?: string): Promise<{
    success: boolean;
    proxyUrl?: string;
    coverUrl?: string;
    error?: string;
    strategy: string;
  }> {
    try {
      // 策略1: 如果有视频URL，尝试创建视频代理
      if (videoUrl) {
        try {
          const proxyUrl = await this.proxyService.getVideoProxyUrl(videoInfo, videoUrl);
          console.log('✅ 视频代理创建成功');
          
          return {
            success: true,
            proxyUrl,
            strategy: 'video_proxy'
          };
        } catch (videoError) {
          console.warn('视频代理创建失败，尝试封面代理:', videoError);
        }
      }
      
      // 策略2: 尝试创建封面图片代理
      if (videoInfo.cover) {
        try {
          const coverUrl = await this.proxyService.getCoverProxyUrl(videoInfo);
          console.log('✅ 封面代理创建成功');
          
          return {
            success: true,
            coverUrl,
            strategy: 'cover_proxy'
          };
        } catch (coverError) {
          console.warn('封面代理创建失败:', coverError);
        }
      }
      
      // 策略3: 如果都失败，返回错误
      return {
        success: false,
        error: '无法创建视频或封面代理',
        strategy: 'none'
      };
      
    } catch (error) {
      console.error('创建视频代理失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        strategy: 'error'
      };
    }
  }
  
  /**
   * 清理缓存
   */
  cleanupCache(): void {
    this.proxyService.cleanupCache();
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.proxyService.getCacheStats();
  }
}