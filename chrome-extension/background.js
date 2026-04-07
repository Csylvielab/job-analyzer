/**
 * JobAnalyzer AI - Background Service Worker
 * 处理扩展生命周期事件
 */

// 监听安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[JobAnalyzer AI] Extension installed');

    // 设置默认配置
    chrome.storage.local.set({
      apiEndpoint: 'http://127.0.0.1:8000/analyze',
      enabled: true
    });
  } else if (details.reason === 'update') {
    console.log('[JobAnalyzer AI] Extension updated');
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeJD') {
    // 转发到 popup 进行处理
    chrome.action.openPopup().then(() => {
      // 通知 popup 有新的分析请求
      chrome.runtime.sendMessage({
        action: 'newAnalysisRequest',
        data: message.data
      });
    }).catch(err => {
      // popup 可能没有打开，直接在 background 处理
      fetch(message.data.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.data.payload)
      }).then(res => res.json())
        .then(result => {
          sendResponse({ success: true, data: result });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
    });
    return true; // 异步响应
  }
});

// 监听 tab 更新事件，用于检测 SPA 导航
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('zhipin.com')) {
    // 可以在这里做一些初始化
    console.log('[JobAnalyzer AI] Tab updated:', tab.url);
  }
});

console.log('[JobAnalyzer AI] Background service worker started');
