import axios from 'axios';
import { VideoInfo } from '../types';
import { BiliUrl } from './biliUrl';

export class VideoStreamExtractor {
  private static biliUrl = new BiliUrl();

  /**
   * 从Bilibili获取视频流URL - 使用新的BiliUrl类
   */
  static async getVideoStreamUrl(bvid: string): Promise<string | null> {
    try {
      console.log(`使用BiliUrl类获取BVID: ${bvid} 的视频流URL...`);
      
      // 使用新的BiliUrl类获取完整的视频流信息
      const streamInfo = await this.biliUrl.getVideoStream(`https://www.bilibili.com/video/${bvid}/`);
      
      if (streamInfo.type === 'dash' && streamInfo.streams.video && streamInfo.streams.video.length > 0) {
        // 返回最高画质的视频流URL
        return streamInfo.streams.video[0].url;
      } else if (streamInfo.type === 'flv' && streamInfo.streams.urls && streamInfo.streams.urls.length > 0) {
        // 返回FLV格式的视频流URL
        return streamInfo.streams.urls[0].url;
      }
      
      return null;
    } catch (error) {
      console.error('使用BiliUrl获取视频流URL失败:', error);
      
      // 如果新方法失败，回退到旧方法
      console.log('回退到旧的获取方法...');
      return this.getVideoStreamUrlFallback(bvid);
    }
  }

  /**
   * 旧的获取方法作为备用方案
   */
  private static async getVideoStreamUrlFallback(bvid: string): Promise<string | null> {
    try {
      console.log(`使用备用方法获取BVID: ${bvid} 的视频流URL...`);
      
      // 第一步：获取视频基本信息和cid
      const pageInfoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const pageResponse = await axios.get(pageInfoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.bilibili.com/'
        }
      });
      
      if (pageResponse.data.code !== 0) {
        throw new Error(`API错误: ${pageResponse.data.message}`);
      }
      
      const videoData = pageResponse.data.data;
      const cid = videoData.cid;
      
      // 第二步：获取视频流URL
      const streamUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&type=&otype=json`;
      const streamResponse = await axios.get(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': `https://www.bilibili.com/video/${bvid}/`
        }
      });
      
      if (streamResponse.data.code !== 0) {
        throw new Error(`视频流API错误: ${streamResponse.data.message}`);
      }
      
      const streamData = streamResponse.data.data;
      const durl = streamData.durl;
      
      if (durl && durl.length > 0) {
        // 返回第一个视频流URL
        return durl[0].url;
      }
      
      return null;
    } catch (error) {
      console.error('备用方法获取视频流URL失败:', error);
      return null;
    }
  }
  
  /**
   * 获取DASH格式的视频和音频流（分离流，质量更高）
   */
  static async getDashStreams(bvid: string): Promise<{
    videoUrl: string;
    audioUrl: string;
    quality: string;
    duration: number;
  } | null> {
    try {
      console.log(`获取BVID: ${bvid} 的DASH流...`);
      
      // 获取视频基本信息
      const { cid, title } = await this.biliUrl.getCid(bvid);
      console.log(`获取视频信息: ${title} (CID: ${cid})`);
      
      // 获取DASH流
      const dashStreams = await this.biliUrl.getStream(bvid, cid, 80); // 1080P
      console.log('成功获取DASH流:', dashStreams);
      
      return {
        videoUrl: dashStreams.videoUrl,
        audioUrl: dashStreams.audioUrl,
        quality: dashStreams.quality,
        duration: 0 // 可以从其他API获取
      };
    } catch (error) {
      console.error('获取DASH流失败:', error);
      return null;
    }
  }

  /**
   * 获取完整视频流信息，包括所有可用格式和质量
   */
  static async getCompleteStreamInfo(bvid: string): Promise<{
    bvid: string;
    title: string;
    cid: number;
    dash?: any;
    flv?: any;
    duration: number;
  } | null> {
    try {
      console.log(`获取BVID: ${bvid} 的完整流信息...`);
      
      const streamInfo = await this.biliUrl.getVideoStream(`https://www.bilibili.com/video/${bvid}/`);
      console.log('成功获取完整流信息:', streamInfo);
      
      return {
        bvid: streamInfo.bvid,
        title: streamInfo.title,
        cid: streamInfo.cid,
        dash: streamInfo.type === 'dash' ? streamInfo.streams : undefined,
        flv: streamInfo.type === 'flv' ? streamInfo.streams : undefined,
        duration: streamInfo.streams.duration || 0
      };
    } catch (error) {
      console.error('获取完整流信息失败:', error);
      return null;
    }
  }

  /**
   * 获取适合大模型分析的视频片段（短片段，关键帧）
   */
  static async getVideoSegmentForAnalysis(bvid: string, segmentDuration: number = 30): Promise<{
    videoUrl: string;
    actualDuration: number;
    segmentDuration: number;
    quality: string;
  } | null> {
    try {
      const dashStreams = await this.getDashStreams(bvid);
      if (!dashStreams) {
        return null;
      }
      
      // 这里可以添加更多逻辑来选择合适的视频片段
      // 比如获取视频的前30秒用于分析
      return {
        videoUrl: dashStreams.videoUrl,
        actualDuration: dashStreams.duration,
        segmentDuration: Math.min(segmentDuration, dashStreams.duration || segmentDuration),
        quality: dashStreams.quality
      };
    } catch (error) {
      console.error('获取视频片段失败:', error);
      return null;
    }
  }
  static async getVideoCoverImage(videoInfo: VideoInfo): Promise<string | null> {
    try {
      // 如果已经有封面URL，直接返回
      if (videoInfo.cover) {
        return videoInfo.cover;
      }
      
      // 尝试从Bilibili API获取封面
      if (videoInfo.bvid) {
        const pageInfoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoInfo.bvid}`;
        const pageResponse = await axios.get(pageInfoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.bilibili.com/'
          }
        });
        
        if (pageResponse.data.code === 0) {
          const pic = pageResponse.data.data.pic;
          if (pic) {
            // Bilibili的图片URL需要添加协议头
            return pic.startsWith('http') ? pic : `https:${pic}`;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取视频封面失败:', error);
      return null;
    }
  }
}