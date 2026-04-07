/**
 * JobAnalyzer AI - Content Script
 * 负责从 zhipin.com 提取 JD 并注入分析按钮
 */

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    API_ENDPOINT: 'http://localhost:3000/api/analyze',
    TARGET_SELECTORS: {
      // 职位名称
      jobTitle: '.job-title h1, .info-primary h1, .job-name, [class*="job-title"]',
      // 薪资
      salary: '.salary, .info-primary .salary, [class*="salary"]',
      // 公司名称
      company: '.company-name, .info-primary .name, [class*="company-name"]',
      // JD 正文
      jobDesc: '.job-detail-content, .job-sec-text, .detail-content, .job-desc, [class*="detail"]',
      // 立即沟通按钮（用于定位注入位置）
      contactBtn: '.btn-container a, .btn-start-chat, [class*="chat"], .sider- 操作'
    },
    // 按钮样式
    BUTTON_TEXT: 'AI 深度分析',
    BUTTON_CLASS: 'jobanalyzer-ai-btn'
  };

  // 日志工具
  const log = {
    info: (...args) => console.log('[JobAnalyzer AI]', ...args),
    error: (...args) => console.error('[JobAnalyzer AI Error]', ...args)
  };

  /**
   * 从页面 DOM 中提取 JD 信息
   */
  function extractJobDetail() {
    const result = {
      source: 'zhipin.com',
      url: window.location.href,
      extractedAt: new Date().toISOString(),
      jobTitle: '',
      salary: '',
      company: '',
      jobDescription: ''
    };

    try {
      // 提取职位名称
      const titleEl = document.querySelector(CONFIG.TARGET_SELECTORS.jobTitle);
      if (titleEl) {
        result.jobTitle = titleEl.textContent.trim();
      }

      // 提取薪资
      const salaryEl = document.querySelector(CONFIG.TARGET_SELECTORS.salary);
      if (salaryEl) {
        result.salary = salaryEl.textContent.trim();
      }

      // 提取公司名称
      const companyEl = document.querySelector(CONFIG.TARGET_SELECTORS.company);
      if (companyEl) {
        result.company = companyEl.textContent.trim();
      }

      // 提取 JD 正文 - 尝试多个选择器
      const descSelectors = [
        '.job-detail-content',
        '.job-sec-text',
        '.detail-content',
        '#jobDetail',
        '.job-desc',
        '[class*="job-detail"]',
        '[class*="description"]'
      ];

      for (const selector of descSelectors) {
        const descEl = document.querySelector(selector);
        if (descEl && descEl.textContent.trim().length > 100) {
          result.jobDescription = descEl.textContent.trim();
          break;
        }
      }

      // 如果还是没找到，尝试获取所有文本内容
      if (!result.jobDescription) {
        const bodyText = document.body.innerText;
        const jdMatch = bodyText.match(/(?:职位描述|岗位描述|Job Description|岗位职责)[:：]?([\s\S]{500,})/i);
        if (jdMatch) {
          result.jobDescription = jdMatch[1].trim();
        }
      }

      log.info('提取结果:', result);
      return result;

    } catch (err) {
      log.error('提取 JD 失败:', err);
      return null;
    }
  }

  /**
   * 获取 API 设置
   */
  async function getApiSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['jobanalyzer_api_key', 'jobanalyzer_ai_provider'], (result) => {
        resolve({
          apiKey: result.jobanalyzer_api_key || '',
          aiProvider: result.jobanalyzer_ai_provider || 'deepseek'
        });
      });
    });
  }

  /**
   * 发送数据到 Next.js API
   * Next.js API 是流式返回，需要特殊处理
   */
  async function sendToBackend(jobData) {
    try {
      log.info('正在发送数据到后端...');

      // 获取 API 设置
      const settings = await getApiSettings();

      // 构建发送给 Next.js 的文本格式
      // Next.js /api/analyze 期望 { text: "..." } 格式
      const textToSend = [
        `公司名称：${jobData.company || ''}`,
        `岗位名称：${jobData.jobTitle || ''}`,
        `薪资：${jobData.salary || ''}`,
        '',
        jobData.jobDescription || ''
      ].filter(Boolean).join('\n');

      log.info('发送文本长度:', textToSend.length);

      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.apiKey,
          'X-AI-Provider': settings.aiProvider
        },
        body: JSON.stringify({ text: textToSend })
      });

      if (!response.ok) {
        let errorMsg = '';
        try {
          const errorText = await response.text();
          // 尝试解析 JSON 错误
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.message || errorText.slice(0, 200);
        } catch {
          errorMsg = `HTTP ${response.status}`;
        }
        throw new Error(`API 请求失败: ${errorMsg}`);
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
      }

      log.info('后端返回内容长度:', fullContent.length);

      // 检查返回内容是否为空或错误
      if (!fullContent || fullContent.trim().length === 0) {
        throw new Error('后端返回了空内容，可能是 API Key 未配置或已失效');
      }

      // 检查是否返回了 JSON 错误格式（而非流式文本）
      if (fullContent.trim().startsWith('{')) {
        try {
          const jsonResp = JSON.parse(fullContent);
          if (jsonResp.error) {
            throw new Error(`后端错误: ${jsonResp.error}`);
          }
        } catch (e) {
          if (e.message.includes('后端错误')) throw e;
          // 可能是部分 JSON，继续使用
        }
      }

      return fullContent;

    } catch (err) {
      log.error('请求失败:', err);
      throw err;
    }
  }

  /**
   * 简单的 Markdown 转 HTML (支持基本语法)
   */
  function parseMarkdown(text) {
    if (!text) return '';

    let html = text
      // 转义 HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 代码块
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 加粗
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // 列表
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // 换行
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // 包裹列表
    html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
    // 包裹段落
    html = '<p>' + html + '</p>';
    // 清理空段落
    html = html.replace(/<p><\/p>/g, '');
    // 修复列表包裹
    html = html.replace(/<\/ul><p>/g, '</ul><p>');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');

    return html;
  }

  /**
   * 创建结果展示面板
   */
  function createResultPanel(result, error = null) {
    // 移除已存在的面板
    const existing = document.getElementById('jobanalyzer-result-panel');
    if (existing) existing.remove();

    // 创建面板容器
    const panel = document.createElement('div');
    panel.id = 'jobanalyzer-result-panel';

    let bodyContent = '';

    if (error) {
      // 解析错误信息，分离原因和解决方案
      const errorStr = String(error);
      const parts = errorStr.split('💡');
      const errorReason = parts[0].replace(/^❌\s*/, '').trim();
      const errorHint = parts[1] ? '💡' + parts[1] : '';

      bodyContent = `
        <div class="ji-error">
          <div class="ji-error-icon">⚠️</div>
          <div class="ji-error-title">分析失败</div>
          <div class="ji-error-reason">${errorReason}</div>
          ${errorHint ? `<div class="ji-error-hint">${errorHint.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      `;
    } else if (result.analysisText) {
      // Next.js 返回的 Markdown 分析报告
      bodyContent = `
        <div class="ji-summary">
          <div class="ji-summary-text" style="width: 100%;">
            <h3>${result.jobTitle || '职位分析'}</h3>
            <p>${result.company || ''} ${result.salary ? '· ' + result.salary : ''}</p>
          </div>
        </div>
        <div class="ji-section">
          <div class="ji-analysis ji-markdown">${parseMarkdown(result.analysisText)}</div>
        </div>
      `;
    } else {
      // 兼容旧的结构化数据格式
      bodyContent = `
        <div class="ji-summary">
          <div class="ji-score">
            <div class="ji-score-circle" style="--score: ${result.score || 0}">
              <span class="ji-score-value">${result.score || 0}</span>
              <span class="ji-score-label">匹配度</span>
            </div>
          </div>
          <div class="ji-summary-text">
            <h3>${result.jobTitle || '未知职位'}</h3>
            <p>${result.company || ''} · ${result.salary || ''}</p>
          </div>
        </div>

        ${result.keywords && result.keywords.length > 0 ? `
          <div class="ji-section">
            <h4>🎯 技能关键词</h4>
            <div class="ji-tags">
              ${result.keywords.map(k => `<span class="ji-tag">${k}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${result.warnings && result.warnings.length > 0 ? `
          <div class="ji-section ji-warnings">
            <h4>🚨 避雷预警</h4>
            <ul>
              ${result.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${result.analysis ? `
          <div class="ji-section">
            <h4>📋 深度分析</h4>
            <div class="ji-analysis">${result.analysis}</div>
          </div>
        ` : ''}
      `;
    }

    panel.innerHTML = `
      <div class="ji-overlay"></div>
      <div class="ji-panel">
        <div class="ji-header">
          <div class="ji-title">
            <span class="ji-logo">⚡</span>
            <span>JobAnalyzer AI 分析结果</span>
          </div>
          <button class="ji-close" id="ji-close-btn">&times;</button>
        </div>
        <div class="ji-body">
          ${bodyContent}
        </div>
        <div class="ji-footer">
          <span class="ji-powered">Powered by JobAnalyzer AI</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 绑定关闭事件
    document.getElementById('ji-close-btn').addEventListener('click', () => {
      panel.remove();
    });

    panel.querySelector('.ji-overlay').addEventListener('click', () => {
      panel.remove();
    });

    // 动画入场
    requestAnimationFrame(() => {
      panel.classList.add('ji-active');
    });

    return panel;
  }

  /**
   * 创建加载状态面板
   */
  function createLoadingPanel(extractedInfo = '') {
    const existing = document.getElementById('jobanalyzer-result-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'jobanalyzer-result-panel';
    panel.innerHTML = `
      <div class="ji-overlay"></div>
      <div class="ji-panel">
        <div class="ji-header">
          <div class="ji-title">
            <span class="ji-logo">⚡</span>
            <span>JobAnalyzer AI 分析中...</span>
          </div>
          <button class="ji-close" id="ji-close-btn">&times;</button>
        </div>
        <div class="ji-body ji-loading">
          <div class="ji-spinner"></div>
          <p>正在分析职位信息</p>
          ${extractedInfo ? `<p class="ji-loading-tip" style="max-width: 300px; word-break: break-all;">${extractedInfo}</p>` : ''}
          <p class="ji-loading-tip">正在提取 JD、关键词并生成分析报告...</p>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('ji-close-btn').addEventListener('click', () => {
      panel.remove();
    });

    requestAnimationFrame(() => {
      panel.classList.add('ji-active');
    });

    return panel;
  }

  /**
   * 注入分析按钮
   */
  function injectAnalysisButton() {
    // 避免重复注入
    if (document.querySelector('.' + CONFIG.BUTTON_CLASS)) {
      log.info('按钮已存在，跳过注入');
      return;
    }

    // 查找按钮容器
    const btnContainer = document.querySelector('.btn-container, .sider-bar, [class*="action"]');

    if (!btnContainer) {
      log.info('未找到按钮容器，等待页面加载...');
      setTimeout(injectAnalysisButton, 1000);
      return;
    }

    // 创建按钮
    const btn = document.createElement('button');
    btn.className = CONFIG.BUTTON_CLASS;
    btn.innerHTML = `⚡ ${CONFIG.BUTTON_TEXT}`;
    btn.title = '使用 AI 深度分析此职位';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      log.info('用户点击了 AI 分析按钮');

      // 提取 JD
      const jobData = extractJobDetail();

      log.info('提取结果:', JSON.stringify(jobData, null, 2));

      if (!jobData) {
        createResultPanel(null, '❌ 无法读取页面内容，请刷新页面后重试');
        return;
      }

      // 显示提取到的信息用于调试
      const extractedInfo = [
        jobData.jobTitle ? `职位：${jobData.jobTitle}` : '职位：未找到',
        jobData.company ? `公司：${jobData.company}` : '公司：未找到',
        jobData.salary ? `薪资：${jobData.salary}` : '薪资：未找到',
        jobData.jobDescription ? `描述长度：${jobData.jobDescription.length}字符` : '描述：未找到'
      ].join('<br>');

      if (!jobData.jobTitle && !jobData.company && !jobData.jobDescription) {
        createResultPanel(null, `❌ 未识别到职位信息<br><br>已提取：<br>${extractedInfo}<br><br>请确保你在<strong>职位详情页</strong>（不是列表页）`);
        return;
      }

      if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
        createResultPanel(null, `❌ 职位描述内容过少<br><br>已提取：<br>${extractedInfo}<br><br>请尝试：<br>1. 刷新页面<br>2. 确保页面已完全加载`);
        return;
      }

      log.info('提取到的 JD 长度:', jobData.jobDescription.length);

      // 显示加载状态（带提取信息）
      createLoadingPanel(extractedInfo);

      try {
        // 发送到后端 (流式)
        const result = await sendToBackend(jobData);
        // 显示结果 (流式文本)
        createResultPanel({...jobData, analysisText: result});
      } catch (err) {
        const errMsg = err.message || '';
        let hint = '';

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
          hint = '<br><br>💡 解决方案：<br>1. 确保 Next.js 开发服务器已启动<br>2. 确保 API Key 已配置（在设置中）';
        } else if (errMsg.includes('API Key') || errMsg.includes('401') || errMsg.includes('403')) {
          hint = '<br><br>💡 请在插件设置中配置有效的 API Key';
        } else if (errMsg.includes('429') || errMsg.includes('rate limit')) {
          hint = '<br><br>💡 请求过于频繁，请稍后再试';
        }

        createResultPanel(null, `❌ 分析失败：${errMsg}${hint}`);
      }
    });

    // 插入按钮
    btnContainer.appendChild(btn);
    log.info('AI 分析按钮已注入');
  }

  /**
   * 监听来自 popup 或 background 的消息
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractJD') {
      const data = extractJobDetail();
      sendResponse(data);
    } else if (message.action === 'showResult') {
      // 显示分析结果面板
      const jobData = message.jobData;
      const analysis = message.analysis;
      createResultPanel({...jobData, ...analysis});
      sendResponse({ success: true });
    } else if (message.action === 'startAnalysis') {
      // Popup 委托的完整分析流程
      (async () => {
        try {
          const jobData = extractJobDetail();
          if (!jobData || !jobData.jobDescription) {
            sendResponse({ error: '无法提取职位信息，请在职位详情页使用' });
            return;
          }
          createLoadingPanel();
          const result = await sendToBackend(jobData);
          createResultPanel({...jobData, analysisText: result});
          sendResponse({ success: true });
        } catch (err) {
          createResultPanel(null, err.message || '分析失败，请检查后端服务');
          sendResponse({ error: err.message });
        }
      })();
      return; // 异步响应
    }
    return true;
  });

  /**
   * 初始化
   */
  function init() {
    log.info('JobAnalyzer AI Content Script 已加载');

    // 等待页面完全加载后注入按钮
    if (document.readyState === 'complete') {
      setTimeout(injectAnalysisButton, 1500);
    } else {
      window.addEventListener('load', () => {
        setTimeout(injectAnalysisButton, 1500);
      });
    }

    // 监听 URL 变化（BOSS 直聘是 SPA）
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log.info('页面 URL 变化，重新注入按钮');
        setTimeout(injectAnalysisButton, 1500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
