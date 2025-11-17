import { VideoExtractor } from '../services/videoExtractor';

// 模拟DOM环境
const mockDocument = (html: string) => {
  document.body.innerHTML = html;
  // 模拟window.__INITIAL_STATE__
  (window as any).__INITIAL_STATE__ = {
    bvid: 'BV1xx411c7mD',
    videoData: {
      duration: 1800,
      pic: 'https://example.com/cover.jpg',
      cid: '123456789'
    }
  };
};

describe('VideoExtractor', () => {
  beforeEach(() => {
    // 重置DOM
    document.body.innerHTML = '';
    delete (window as any).__INITIAL_STATE__;
  });

  describe('extractVideoInfo', () => {
    it('应该正确提取普通视频页面信息', () => {
      mockDocument(`
        <h1 class="video-title">测试视频标题</h1>
        <meta property="og:image" content="https://example.com/cover.jpg">
        <meta property="og:title" content="测试视频标题 - 哔哩哔哩">
      `);
      
      // 创建模拟的location对象
      const mockLocation = {
        href: 'https://www.bilibili.com/video/BV1xx411c7mD?p=1&t=30',
        search: '?p=1&t=30'
      } as Location;

      const result = VideoExtractor.extractVideoInfo(mockLocation);
      
      expect(result).toBeTruthy();
      expect(result?.title).toBe('测试视频标题');
      expect(result?.bvid).toBe('BV1xx411c7mD');
      expect(result?.url).toContain('https://www.bilibili.com/video/BV1xx411c7mD');
    });

    it('应该在非视频页面返回null', () => {
      // 创建模拟的location对象
      const mockLocation = {
        href: 'https://www.bilibili.com/',
        search: ''
      } as Location;

      const result = VideoExtractor.extractVideoInfo(mockLocation);
      expect(result).toBeNull();
    });

    it('应该正确解析视频时长', () => {
      mockDocument(`
        <span class="duration">12:34</span>
      `);
      
      // 创建模拟的location对象
      const mockLocation = {
        href: 'https://www.bilibili.com/video/BV1xx411c7mD',
        search: ''
      } as Location;

      const result = VideoExtractor.extractVideoInfo(mockLocation);
      expect(result?.duration).toBe(754); // 12*60 + 34
    });
  });

  describe('URL清理', () => {
    it('应该清理URL参数', () => {
      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD?p=1&t=30&from=search&seid=123456789';
      // 创建模拟的location对象
      const mockLocation = {
        href: testUrl,
        search: '?p=1&t=30&from=search&seid=123456789'
      } as Location;

      const result = VideoExtractor.extractVideoInfo(mockLocation);
      expect(result?.url).toBe('https://www.bilibili.com/video/BV1xx411c7mD?p=1&t=30');
    });
  });
});