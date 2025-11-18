import axios from 'axios';
import { VideoInfo } from '../types';

export class VideoStreamExtractor {
  /**
   * 从Bilibili获取视频流URL
   */
  static async getVideoStreamUrl(bvid: string): Promise<string | null> {
    try {
      console.log(`获取BVID: ${bvid} 的视频流URL...`);
      
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
      console.error('获取视频流URL失败:', error);
      return null;
    }
  }
  
  /**
   * 获取视频封面图片
   */
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