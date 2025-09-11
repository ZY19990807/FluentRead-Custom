/**
 * 被动学习模式核心模块
 * 实现中文分词、词语选择、翻译和替换功能
 */

import { config } from './config';
import { translateText } from './translateApi';
import { cache } from './cache';

// 被动学习模式状态
interface PassiveLearningState {
    isEnabled: boolean;
    processedElements: Set<Element>;
    learnedWords: Set<string>;
    translationCache: Map<string, string>;
}

// 词语信息接口
interface WordInfo {
    text: string;
    startIndex: number;
    endIndex: number;
    element: Element;
    node: Text;
}

// 翻译结果接口
interface TranslationResult {
    original: string;
    translated: string;
    element: Element;
    node: Text;
    startIndex: number;
    endIndex: number;
}

class PassiveLearningManager {
    private state: PassiveLearningState = {
        isEnabled: false,
        processedElements: new Set(),
        learnedWords: new Set(),
        translationCache: new Map()
    };

    // 中文分词正则表达式
    private chineseWordRegex = /[\u4e00-\u9fff]+/g;
    
    // 密度配置
    private densityConfig = {
        light: 0.1,    // 10%
        medium: 0.2,   // 20%
        heavy: 0.4     // 40%
    };

    // 初始化被动学习模式
    async init() {
        console.log('被动学习模式初始化，配置状态:', config.passiveLearningMode);
        console.log('当前配置:', {
            passiveLearningMode: config.passiveLearningMode,
            passiveLearningDensity: config.passiveLearningDensity,
            passiveLearningDisplayMode: config.passiveLearningDisplayMode,
            passiveLearningRecord: config.passiveLearningRecord
        });
        
        // 设置翻译配置为中文到英文
        const originalTo = config.to;
        const originalFrom = config.from;
        config.to = 'en';  // 设置目标语言为英文
        config.from = 'zh-Hans';  // 设置源语言为简体中文
        
        console.log('翻译配置已设置为:', { from: config.from, to: config.to });
        
        // 强制启动，忽略配置检查
        console.log('强制启动被动学习模式...');
        
        this.state.isEnabled = true;
        this.loadLearnedWords();
        this.startPassiveLearning();
        console.log('被动学习模式已启动');
    }

    // 停止被动学习模式
    stop() {
        this.state.isEnabled = false;
        this.restoreAllTranslations();
        this.state.processedElements.clear();
    }

    // 开始被动学习
    private startPassiveLearning() {
        if (!this.state.isEnabled) return;

        console.log('开始被动学习，处理页面内容...');
        
        // 添加一个测试函数来强制测试翻译
        this.testTranslation();
        
        // 处理当前页面的文本内容
        this.processPageContent();
        
        // 监听页面变化
        this.observePageChanges();
    }

    // 测试翻译功能
    private async testTranslation() {
        console.log('测试翻译功能...');
        console.log('当前配置:', {
            service: config.service,
            to: config.to,
            from: config.from,
            on: config.on
        });
        
        try {
            console.log('测试翻译API调用...');
            const testResult = await translateText('测试', document.title, {
                useCache: false,
                timeout: 5000
            });
            console.log('测试翻译结果:', testResult);
            
            // 查找页面上的中文文本并尝试翻译
            const chineseTexts = this.findChineseTexts();
            console.log('找到的中文文本:', chineseTexts);
            
            if (chineseTexts.length > 0) {
                const firstText = chineseTexts[0];
                console.log('尝试翻译第一个中文文本:', firstText);
                const translation = await translateText(firstText, document.title, {
                    useCache: false,
                    timeout: 5000
                });
                console.log('翻译结果:', firstText, '->', translation);
            }
        } catch (error) {
            console.error('测试翻译失败:', error);
            if (error instanceof Error) {
                console.error('错误堆栈:', error.stack);
            }
        }
    }

    // 查找页面上的中文文本
    private findChineseTexts(): string[] {
        const chineseTexts: string[] = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent || '';
                    if (this.chineseWordRegex.test(text) && text.trim().length > 0) {
                        chineseTexts.push(text.trim());
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            // 已经在 acceptNode 中处理了
        }

        return chineseTexts.slice(0, 10); // 只返回前10个
    }

    // 处理页面内容
    private processPageContent() {
        const textNodes = this.getTextNodes(document.body);
        console.log('找到文本节点数量:', textNodes.length);
        
        let processedCount = 0;
        for (const node of textNodes) {
            if (this.shouldProcessNode(node)) {
                this.processTextNode(node);
                processedCount++;
            }
        }
        console.log('处理的文本节点数量:', processedCount);
    }

    // 获取所有文本节点
    private getTextNodes(element: Element): Text[] {
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // 过滤掉脚本和样式标签
                    const parent = node.parentElement;
                    if (!parent || 
                        parent.tagName === 'SCRIPT' || 
                        parent.tagName === 'STYLE' ||
                        parent.tagName === 'NOSCRIPT') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // 只处理包含中文的文本节点
                    if (this.chineseWordRegex.test(node.textContent || '')) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node as Text);
        }

        return textNodes;
    }

    // 判断是否应该处理该节点
    private shouldProcessNode(node: Text): boolean {
        if (!node.textContent || node.textContent.trim().length === 0) {
            return false;
        }

        // 检查是否已经处理过
        const parent = node.parentElement;
        if (parent && this.state.processedElements.has(parent)) {
            return false;
        }

        // 检查是否包含中文
        return this.chineseWordRegex.test(node.textContent);
    }

    // 处理文本节点
    private async processTextNode(node: Text) {
        const text = node.textContent || '';
        const words = this.extractChineseWords(text, node);
        
        console.log('文本内容:', text.substring(0, 50) + '...', '找到词语数量:', words.length);
        
        if (words.length === 0) return;

        // 根据密度选择要翻译的词语
        const selectedWords = this.selectWordsForTranslation(words);
        
        console.log('选中的词语数量:', selectedWords.length, '词语:', selectedWords.map(w => w.text));
        
        if (selectedWords.length === 0) return;

        // 翻译选中的词语
        await this.translateAndReplaceWords(selectedWords, node);
        
        // 标记为已处理
        const parent = node.parentElement;
        if (parent) {
            this.state.processedElements.add(parent);
        }
    }

    // 提取中文词语
    private extractChineseWords(text: string, textNode: Text): WordInfo[] {
        const words: WordInfo[] = [];
        let match;
        
        while ((match = this.chineseWordRegex.exec(text)) !== null) {
            const word = match[0];
            
            // 过滤掉太短或太长的词语
            if (word.length < 2 || word.length > 10) continue;
            
            // 过滤掉已学习的词语
            if (config.passiveLearningRecord && this.state.learnedWords.has(word)) {
                continue;
            }

            words.push({
                text: word,
                startIndex: match.index,
                endIndex: match.index + word.length,
                element: textNode.parentElement!,
                node: textNode
            });
        }

        return words;
    }

    // 根据密度选择要翻译的词语
    private selectWordsForTranslation(words: WordInfo[]): WordInfo[] {
        const densityKey = config.passiveLearningDensity as 'light' | 'medium' | 'heavy';
        const density = this.densityConfig[densityKey] || 0.1;
        const targetCount = Math.max(1, Math.floor(words.length * density));
        
        // 随机选择词语
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, targetCount);
    }

    // 翻译并替换词语
    private async translateAndReplaceWords(words: WordInfo[], textNode: Text) {
        for (const wordInfo of words) {
            try {
                const translation = await this.translateWord(wordInfo.text);
                if (translation && translation !== wordInfo.text) {
                    this.replaceWordInText(wordInfo, translation, textNode);
                    
                    // 记录已学习的词语
                    if (config.passiveLearningRecord) {
                        this.state.learnedWords.add(wordInfo.text);
                        this.saveLearnedWords();
                    }
                }
            } catch (error) {
                console.warn('翻译词语失败:', wordInfo.text, error);
            }
        }
    }

    // 翻译单个词语
    private async translateWord(word: string): Promise<string> {
        console.log('开始翻译词语:', word);
        
        // 检查缓存
        if (this.state.translationCache.has(word)) {
            console.log('使用缓存翻译:', word, '->', this.state.translationCache.get(word));
            return this.state.translationCache.get(word)!;
        }

        try {
            console.log('调用翻译API:', word);
            console.log('当前翻译服务:', config.service);
            console.log('翻译方向: 中文 -> 英文');
            
            const translation = await translateText(word, document.title, {
                useCache: true,
                timeout: 10000
            });

            console.log('翻译结果:', word, '->', translation);

            // 缓存翻译结果
            this.state.translationCache.set(word, translation);
            
            return translation;
        } catch (error) {
            console.error('翻译失败:', word, error);
            console.error('错误详情:', error);
            return word;
        }
    }

    // 在文本中替换词语
    private replaceWordInText(wordInfo: WordInfo, translation: string, textNode: Text) {
        const text = textNode.textContent || '';
        const before = text.substring(0, wordInfo.startIndex);
        const after = text.substring(wordInfo.endIndex);
        
        let replacement: string;
        if (config.passiveLearningDisplayMode === 'bracket') {
            replacement = `${wordInfo.text}(${translation})`;
        } else {
            replacement = translation;
        }

        const newText = before + replacement + after;
        textNode.textContent = newText;

        // 添加样式类
        this.addTranslationStyles(textNode.parentElement!);
    }

    // 添加翻译样式
    private addTranslationStyles(element: Element) {
        element.classList.add('fluent-read-passive-learning');
        
        // 添加悬停显示原文的功能
        element.addEventListener('mouseenter', this.showOriginalText);
        element.addEventListener('mouseleave', this.hideOriginalText);
    }

    // 显示原文
    private showOriginalText = (event: Event) => {
        const element = event.target as Element;
        const originalText = element.getAttribute('data-original-text');
        
        if (originalText) {
            this.showTooltip(event, originalText);
        }
    };

    // 隐藏原文
    private hideOriginalText = () => {
        this.hideTooltip();
    };

    // 显示提示框
    private showTooltip(event: Event, text: string) {
        const tooltip = document.createElement('div');
        tooltip.className = 'fluent-read-passive-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            max-width: 200px;
            word-wrap: break-word;
        `;

        document.body.appendChild(tooltip);

        const rect = (event.target as Element).getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
    }

    // 隐藏提示框
    private hideTooltip() {
        const tooltip = document.querySelector('.fluent-read-passive-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // 监听页面变化
    private observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            if (!this.state.isEnabled) return;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            const textNodes = this.getTextNodes(element);
                            
                            for (const textNode of textNodes) {
                                if (this.shouldProcessNode(textNode)) {
                                    this.processTextNode(textNode);
                                }
                            }
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 恢复所有翻译
    private restoreAllTranslations() {
        const elements = document.querySelectorAll('.fluent-read-passive-learning');
        elements.forEach(element => {
            element.classList.remove('fluent-read-passive-learning');
            element.removeEventListener('mouseenter', this.showOriginalText);
            element.removeEventListener('mouseleave', this.hideOriginalText);
        });
    }

    // 加载已学习的词语
    private loadLearnedWords() {
        if (!config.passiveLearningRecord) return;

        try {
            const saved = localStorage.getItem('fluent-read-learned-words');
            if (saved) {
                const words = JSON.parse(saved);
                this.state.learnedWords = new Set(words);
            }
        } catch (error) {
            console.warn('加载学习记录失败:', error);
        }
    }

    // 保存已学习的词语
    private saveLearnedWords() {
        if (!config.passiveLearningRecord) return;

        try {
            const words = Array.from(this.state.learnedWords);
            localStorage.setItem('fluent-read-learned-words', JSON.stringify(words));
        } catch (error) {
            console.warn('保存学习记录失败:', error);
        }
    }

    // 清除学习记录
    clearLearnedWords() {
        this.state.learnedWords.clear();
        localStorage.removeItem('fluent-read-learned-words');
    }

    // 获取学习统计
    getLearningStats() {
        return {
            learnedWordsCount: this.state.learnedWords.size,
            processedElementsCount: this.state.processedElements.size,
            translationCacheSize: this.state.translationCache.size
        };
    }

    // 检查是否已启用
    isEnabled() {
        return this.state.isEnabled;
    }
}

// 创建全局实例
export const passiveLearningManager = new PassiveLearningManager();

// 导出类型
export type { PassiveLearningState, WordInfo, TranslationResult };
