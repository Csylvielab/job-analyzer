/**
 * JobInsight AI - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = statusIndicator.querySelector('.status-text');
  const statusDot = statusIndicator.querySelector('.status-dot');
  const btnAnalyzeCurrent = document.getElementById('btn-analyze-current');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetSettings = document.getElementById('btn-reset-settings');
  const inputApiEndpoint = document.getElementById('input-api-endpoint');
  const settingsPanel = document.getElementById('settings-panel');
  const statusMessage = document.getElementById('status-message');

  // 默认配置
  const DEFAULT_CONFIG = {
    apiEndpoint: 'http://localhost:3000/api/analyze'
  };

  // 当前配置
  let config = { ...DEFAULT_CONFIG };

  /**
   * 从 storage 加载配置
   */
  async function loadConfig() {
    try {
      const result = await chrome.storage.local.get(['apiEndpoint']);
      if (result.apiEndpoint) {
        config.apiEndpoint = result.apiEndpoint;
        inputApiEndpoint.value = config.apiEndpoint;
      }
    } catch (err) {
      console.error('加载配置失败:', err);
    }
  }

  /**
   * 保存配置到 storage
   */
  async function saveConfig() {
    try {
      config.apiEndpoint = inputApiEndpoint.value.trim();
      await chrome.storage.local.set({ apiEndpoint: config.apiEndpoint });
      showMessage('设置已保存', 'success');
      setTimeout(() => closeSettings(), 500);
    } catch (err) {
      console.error('保存配置失败:', err);
      showMessage('保存失败', 'error');
    }
  }

  /**
   * 重置配置
   */
  function resetConfig() {
    inputApiEndpoint.value = DEFAULT_CONFIG.apiEndpoint;
  }

  /**
   * 显示状态消息
   */
  function showMessage(text, type = 'success') {
    statusMessage.textContent = text;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }

  /**
   * 检测后端连接状态
   */
  async function checkBackendStatus() {
    try {
      // Next.js 没有 /health 端点，直接尝试 /api/analyze
      const response = await fetch(config.apiEndpoint.replace('/analyze', ''), {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      // 能收到响应就说明服务在运行
      setConnectedStatus(true);
    } catch (err) {
      // 连接失败
      setConnectedStatus(false);
    }
  }

  /**
   * 设置连接状态显示
   */
  function setConnectedStatus(connected) {
    statusDot.className = `status-dot ${connected ? 'connected' : 'error'}`;
    statusText.textContent = connected ? '后端已连接' : '后端未连接';
  }

  /**
   * 分析当前页面
   * 委托给 content script 处理（包括 API 调用和结果显示）
   */
  async function analyzeCurrentPage() {
    try {
      // 获取当前活动标签
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes('zhipin.com')) {
        showMessage('请在 Boss直聘 页面使用此功能', 'error');
        return;
      }

      // 发送消息让 content script 开始分析
      // content script 会：1.提取JD 2.调用API 3.显示结果
      showMessage('正在分析...', 'success');

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' });

      if (response && response.error) {
        showMessage(response.error, 'error');
      }

    } catch (err) {
      console.error('分析失败:', err);
      showMessage(`分析失败: ${err.message}`, 'error');
    }
  }

  /**
   * 打开设置面板
   */
  function openSettings() {
    settingsPanel.style.display = 'block';
  }

  /**
   * 关闭设置面板
   */
  function closeSettings() {
    settingsPanel.style.display = 'none';
  }

  // 事件绑定
  btnAnalyzeCurrent.addEventListener('click', analyzeCurrentPage);
  btnOpenSettings.addEventListener('click', openSettings);
  btnCloseSettings.addEventListener('click', closeSettings);
  btnSaveSettings.addEventListener('click', saveConfig);
  btnResetSettings.addEventListener('click', resetConfig);

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'newAnalysisRequest') {
      // 有新的分析请求
      console.log('收到新分析请求:', message.data);
    }
  });

  // 初始化
  loadConfig();
  checkBackendStatus();

  // 每 30 秒检测一次后端状态
  setInterval(checkBackendStatus, 30000);
});
