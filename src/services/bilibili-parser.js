// B站视频解析器 - 基于测试脚本的核心功能
export class BilibiliVideoParser {
  constructor() {
    this.baseApiUrl = 'https://api.bilibili.com/x/web-interface/view';
    this.playUrlApi = 'https://api.bilibili.com/x/player/playurl';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.bilibili.com'
    };
  }

  /**
   * 从B站视频链接中提取BV号
   * @param {string} url - B站视频链接
   * @returns {string} BV号
   */
  extractBV(url) {
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
   * @param {string} bvid - BV号
   * @returns {Promise<Object>} 视频信息
   */
  async getVideoInfo(bvid) {
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
        bvid: data.data.bvid,
        title: data.data.title,
        desc: data.data.desc,
        pic: data.data.pic,
        pages: data.data.pages.map(page => ({
          cid: page.cid,
          part: page.part,
          title: page.part,
          duration: page.duration,
          page: page.page
        })),
        owner: {
          mid: data.data.owner.mid,
          name: data.data.owner.name,
          face: data.data.owner.face
        },
        duration: data.data.duration,
        view: data.data.stat.view,
        danmaku: data.data.stat.danmaku,
        reply: data.data.stat.reply,
        favorite: data.data.stat.favorite,
        coin: data.data.stat.coin,
        share: data.data.stat.share,
        like: data.data.stat.like
      };
    } catch (error) {
      console.error('❌ 获取视频信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取MP4/FLV视频播放地址（非DASH格式）
   * @param {number} aid - 视频aid
   * @param {number} cid - 视频cid
   * @param {number} qn - 视频质量
   * @returns {Promise<Array>} MP4/FLV下载地址
   */
  async getVideoUrls(aid, cid, qn = 64) {
    try {
      const params = new URLSearchParams({
        avid: aid,
        cid: cid,
        qn: qn,        // 720P或更低，提高兼容性
        type: '',
        otype: 'json',
        fourk: 0,      // 禁用4K
        fnver: 0,
        fnval: 0,      // 关键：禁用DASH，强制FLV
        platform: 'html5',  // 使用HTML5平台
        high_quality: 0     // 禁用高质量
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
      
      // 处理FLV格式视频（返回MP4/FLV格式的分段地址）
      if (data.data.durl) {
        return data.data.durl.map(item => ({
          url: item.url,
          size: item.size,
          length: item.length,
          type: 'mp4/flv',
          order: item.order
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
   * @param {string} inputUrl - 用户输入的B站视频链接
   * @param {number} quality - 视频质量选项（默认720P）
   * @returns {Promise<Object>} 解析结果
   */
  async parseVideo(inputUrl, quality = 64) {
    try {
      console.log('🚀 开始解析视频链接:', inputUrl);
      console.log('📋 格式选项: MP4/FLV格式');
      
      // 1. 提取BV号
      const bvid = this.extractBV(inputUrl);
      console.log('📹 提取到BV号:', bvid);
      
      // 2. 获取视频基本信息
      const videoInfo = await this.getVideoInfo(bvid);
      
      // 3. 获取MP4/FLV下载地址
      let allUrls = [];
      
      if (videoInfo.pages.length > 1) {
        // 多P视频
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
          
          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // 单P视频
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
          owner: videoInfo.owner.name,
          duration: videoInfo.duration,
          view: videoInfo.view,
          pages: videoInfo.pages.length,
          description: videoInfo.desc,
          cover: videoInfo.pic
        },
        downloadUrls: allUrls,
        format: 'mp4'
      };
      
    } catch (error) {
      console.error('❌ 视频解析失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 辅助函数：格式化时长
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时长
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 辅助函数：格式化质量
   * @param {number} qn - 质量码
   * @returns {string} 质量描述
   */
  formatQuality(qn) {
    const qualityMap = {
      16: '360P',
      32: '480P',
      64: '720P',
      80: '1080P',
      112: '1080P+',
      116: '1080P60',
      127: '4K',
      126: '杜比视界'
    };
    return qualityMap[qn] || `未知质量(${qn})`;
  }

  /**
   * 辅助函数：格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}