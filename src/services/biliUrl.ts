import axios from 'axios';

export class BiliUrl {
  private sess = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.bilibili.com'
    }
  });

  /**
   * BV转AV（可选，接口其实同时支持BV）
   */
  bv2av(bv: string): number {
    const table = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
    const tr: { [key: string]: number } = {};
    for (let i = 0; i < 58; i++) {
      tr[table[i]] = i;
    }
    const s = [11, 10, 3, 8, 4, 6];
    const xor = 177451812;
    const add = 8728348608;
    
    let r = 0;
    for (let i = 0; i < 6; i++) {
      r += tr[bv[s[i]]] * Math.pow(58, i);
    }
    return (r - add) ^ xor;
  }

  /**
   * 获取cid和视频标题
   */
  async getCid(bvid: string): Promise<{ cid: number; title: string }> {
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    console.log('请求视频信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const info = response.data;
      
      if (info.code !== 0) {
        throw new Error(`API错误: ${info.message}`);
      }
      
      return {
        cid: info.data.cid,
        title: info.data.title
      };
    } catch (error) {
      console.error('获取cid失败:', error);
      throw error;
    }
  }

  /**
   * 获取视频和音频流URL（DASH格式）
   * qn=80=1080P, 120=4K
   */
  async getStream(bvid: string, cid: number, qn: number = 80): Promise<{ videoUrl: string; audioUrl: string; quality: string }> {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=4048&fourk=1`;
    console.log('请求视频流信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const j = response.data;
      
      if (j.code !== 0) {
        throw new Error(`视频流API错误: ${j.message}`);
      }
      
      const dash = j.data.dash;
      if (!dash || !dash.video || !dash.audio) {
        throw new Error('无法获取视频流数据');
      }
      
      // 获取最高画质的视频流
      const video = dash.video.sort((a: any, b: any) => b.id - a.id)[0];
      // 获取最高音质的音频流
      const audio = dash.audio.sort((a: any, b: any) => b.id - a.id)[0];
      
      console.log('获取视频流成功:', {
        videoQuality: video.id,
        audioQuality: audio.id,
        videoCodec: video.codecs,
        audioCodec: audio.codecs
      });
      
      return {
        videoUrl: video.baseUrl,
        audioUrl: audio.baseUrl,
        quality: this.getQualityText(video.id)
      };
    } catch (error) {
      console.error('获取视频流失败:', error);
      throw error;
    }
  }

  /**
   * 获取完整的视频流信息，包括DASH格式的所有可用流
   */
  async getStreamInfo(bvid: string, cid: number) {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=120&fnval=4048&fourk=1`;
    console.log('请求完整视频流信息:', url);
    
    try {
      const response = await this.sess.get(url);
      const j = response.data;
      
      if (j.code !== 0) {
        throw new Error(`视频流API错误: ${j.message}`);
      }
      
      const dash = j.data.dash;
      if (!dash) {
        throw new Error('无法获取DASH流数据');
      }
      
      return {
        video: dash.video.map((v: any) => ({
          url: v.baseUrl,
          quality: v.id,
          qualityText: this.getQualityText(v.id),
          codec: v.codecs,
          bandwidth: v.bandwidth,
          size: v.size
        })),
        audio: dash.audio.map((a: any) => ({
          url: a.baseUrl,
          quality: a.id,
          codec: a.codecs,
          bandwidth: a.bandwidth
        })),
        duration: j.data.timelength
      };
    } catch (error) {
      console.error('获取完整视频流信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取传统的FLV格式视频流（备用方案）
   */
  async getFlvStream(bvid: string, cid: number, qn: number = 80) {
    const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&otype=json`;
    console.log('请求FLV视频流:', url);
    
    try {
      const response = await this.sess.get(url);
      const j = response.data;
      
      if (j.code !== 0) {
        throw new Error(`FLV视频流API错误: ${j.message}`);
      }
      
      const durl = j.data.durl;
      if (!durl || durl.length === 0) {
        throw new Error('无法获取FLV流数据');
      }
      
      return {
        urls: durl.map((item: any) => ({
          url: item.url,
          size: item.size,
          length: item.length,
          order: item.order
        })),
        totalSize: j.data.totalSize,
        duration: j.data.timelength
      };
    } catch (error) {
      console.error('获取FLV视频流失败:', error);
      throw error;
    }
  }

  /**
   * 从Bilibili URL中提取BV号
   */
  extractBvid(url: string): string | null {
    const match = url.match(/(BV\w{10})/);
    return match ? match[1] : null;
  }

  /**
   * 获取画质文本描述
   */
  private getQualityText(quality: number): string {
    const qualityMap: { [key: number]: string } = {
      120: '4K超清',
      116: '1080P60帧',
      112: '1080P+',
      80: '1080P',
      74: '720P60帧',
      64: '720P',
      32: '480P',
      16: '360P'
    };
    return qualityMap[quality] || `${quality}P`;
  }

  /**
   * 完整的视频流获取流程
   */
  async getVideoStream(url: string): Promise<{
    bvid: string;
    title: string;
    cid: number;
    streams: any;
    type: 'dash' | 'flv';
  }> {
    const bvid = this.extractBvid(url);
    if (!bvid) {
      throw new Error('无法从URL中提取BV号');
    }

    console.log(`提取到BV号: ${bvid}`);
    
    // 获取视频基本信息
    const { cid, title } = await this.getCid(bvid);
    console.log(`获取视频信息: ${title} (CID: ${cid})`);

    let streams;
    let type: 'dash' | 'flv' = 'dash';

    try {
      // 优先尝试获取DASH格式（分离的视频和音频流）
      const streamInfo = await this.getStreamInfo(bvid, cid);
      streams = streamInfo;
      console.log('成功获取DASH格式视频流');
    } catch (error) {
      console.log('DASH格式获取失败，尝试FLV格式:', error);
      try {
        // 如果DASH格式失败，尝试FLV格式（合并的音视频流）
        const flvStream = await this.getFlvStream(bvid, cid);
        streams = flvStream;
        type = 'flv';
        console.log('成功获取FLV格式视频流');
      } catch (flvError) {
        throw new Error('无法获取任何格式的视频流');
      }
    }

    return {
      bvid,
      title,
      cid,
      streams,
      type
    };
  }
}