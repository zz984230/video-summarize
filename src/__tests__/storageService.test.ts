import { StorageService } from '../services/storage';

// 模拟chrome.storage API
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// 设置全局chrome对象
(globalThis as any).chrome = mockChrome;

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getModelConfig', () => {
    it('应该返回存储的模型配置', async () => {
      const mockConfig = {
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test-key',
        model: 'gpt-4-vision-preview'
      };

      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        bilibili_summarizer_config: mockConfig
      });

      const result = await StorageService.getModelConfig();
      expect(result).toEqual(mockConfig);
    });

    it('应该返回null当没有配置时', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      const result = await StorageService.getModelConfig();
      expect(result).toBeNull();
    });
  });

  describe('setModelConfig', () => {
    it('应该成功保存模型配置', async () => {
      const mockConfig = {
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test-key'
      };

      (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);

      await StorageService.setModelConfig(mockConfig);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        bilibili_summarizer_config: mockConfig
      });
    });
  });

  describe('getCache', () => {
    it('应该返回缓存记录', async () => {
      const mockCache = [
        {
          url: 'https://www.bilibili.com/video/BV1xx411c7mD',
          result: { overall: '测试摘要' },
          timestamp: Date.now()
        }
      ];

      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        bilibili_summarizer_cache: mockCache
      });

      const result = await StorageService.getCache();
      expect(result).toEqual(mockCache);
    });
  });

  describe('addToCache', () => {
    it('应该添加新记录并限制为最近5条', async () => {
      const existingCache = Array.from({ length: 5 }, (_, i) => ({
        url: `https://example.com/video${i}`,
        result: { overall: `摘要${i}` },
        timestamp: Date.now() - i * 1000
      }));

      const newRecord = {
        url: 'https://www.bilibili.com/video/BV1xx411c7mD',
        result: { overall: '新摘要' },
        timestamp: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        bilibili_summarizer_cache: existingCache
      });
      (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);

      await StorageService.addToCache(newRecord);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        bilibili_summarizer_cache: expect.arrayContaining([newRecord])
      });

      const callArgs = (chrome.storage.local.set as jest.Mock).mock.calls[0][0];
      expect(callArgs.bilibili_summarizer_cache.length).toBe(5);
      expect(callArgs.bilibili_summarizer_cache[0]).toEqual(newRecord);
    });
  });
});