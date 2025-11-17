import { ModelService } from '../services/modelService';

// 模拟axios
const mockAxiosInstance = {
  post: jest.fn()
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}));

describe('ModelService', () => {
  let modelService: ModelService;
  const mockConfig = {
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-test-key',
    model: 'gpt-4-vision-preview'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    modelService = new ModelService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSummary', () => {
    it('应该成功生成摘要', async () => {
      const mockVideoInfo = {
        url: 'https://www.bilibili.com/video/BV1xx411c7mD',
        title: '测试视频',
        duration: 600,
        cover: 'https://example.com/cover.jpg',
        bvid: 'BV1xx411c7mD',
        cid: '123456'
      };

      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: `视频整体摘要：这是一个测试视频，主要介绍了...\n\n分段分析：\n00:00-02:00：开场介绍\n- 介绍了视频主题\n- 说明了制作背景\n\n02:00-05:00：主要内容\n- 详细讲解了核心概念\n- 提供了实际案例`
            }
          }]
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await modelService.generateSummary(mockVideoInfo);

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('segments');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.overall).toBe('string');
      expect(Array.isArray(result.segments)).toBe(true);
    });

    it('应该处理API错误', async () => {
      const mockVideoInfo = {
        url: 'https://www.bilibili.com/video/BV1xx411c7mD',
        title: '测试视频'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(new Error('API错误'));

      await expect(modelService.generateSummary(mockVideoInfo))
        .rejects.toThrow('生成摘要失败');
    });
  });

  describe('testConnection', () => {
    it('应该成功测试连接', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

      const result = await modelService.testConnection();
      expect(result).toBe(true);
    });

    it('应该处理连接失败', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('连接失败'));

      const result = await modelService.testConnection();
      expect(result).toBe(false);
    });
  });
});