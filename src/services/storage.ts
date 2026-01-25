import { ModelConfig } from '../types';

const STORAGE_KEYS = {
  MODEL_CONFIG: 'bilibili_summarizer_config',
  CACHE: 'bilibili_summarizer_cache',
  LAST_PROCESSED: 'bilibili_summarizer_last_processed'
};

export class StorageService {
  static async getModelConfig(): Promise<ModelConfig | null> {
    try {
      const result = await (chrome as any).storage.local.get(STORAGE_KEYS.MODEL_CONFIG);
      return result[STORAGE_KEYS.MODEL_CONFIG] || null;
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return null;
    }
  }

  static async setModelConfig(config: ModelConfig): Promise<void> {
    try {
      await (chrome as any).storage.local.set({ [STORAGE_KEYS.MODEL_CONFIG]: config });
    } catch (error) {
      console.error('保存模型配置失败:', error);
      throw error;
    }
  }

  static async getCache(): Promise<any[]> {
    try {
      const result = await (chrome as any).storage.local.get(STORAGE_KEYS.CACHE);
      return result[STORAGE_KEYS.CACHE] || [];
    } catch (error) {
      console.error('获取缓存失败:', error);
      return [];
    }
  }

  static async addToCache(record: any): Promise<void> {
    try {
      const cache = await this.getCache();
      const updatedCache = [record, ...cache.slice(0, 4)]; // 保持最近5条记录
      await (chrome as any).storage.local.set({ [STORAGE_KEYS.CACHE]: updatedCache });
    } catch (error) {
      console.error('添加缓存失败:', error);
      throw error;
    }
  }

  static async getLastProcessed(): Promise<any | null> {
    try {
      const result = await (chrome as any).storage.local.get(STORAGE_KEYS.LAST_PROCESSED);
      return result[STORAGE_KEYS.LAST_PROCESSED] || null;
    } catch (error) {
      console.error('获取最后处理记录失败:', error);
      return null;
    }
  }

  static async setLastProcessed(record: any): Promise<void> {
    try {
      await (chrome as any).storage.local.set({ [STORAGE_KEYS.LAST_PROCESSED]: record });
    } catch (error) {
      console.error('保存最后处理记录失败:', error);
      throw error;
    }
  }
}