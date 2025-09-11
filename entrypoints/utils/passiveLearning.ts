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

    // 常见虚词/功能词，降低被选中概率或直接跳过
    private STOPWORDS = new Set([
        '的','地','得','了','著','着','和','与','及','并','而','或','又','被','把','在','对','向','往','给','将','把',
        '是','有','无','没','不','呢','吗','吧','啊','呀','哦','嗯','哇','嘛','啦','喽','哦','哟','咯',
        '这','那','哪','啥','什么','一个','一些','自己','我们','你们','他们','她们','它们','其','此','其余','各自',
        '也','都','还','就','又','再','才','并','且','乃至','甚至','以及','或者','如果','因为','所以','但是','然而',
    ]);

    // 全页候选词池
    private candidateWordPool: WordInfo[] = [];
    private isWordPoolBuilt = false;

    // 初始化被动学习模式
    async init() {
        console.log('=== 被动学习模式初始化开始 ===');
        console.log('被动学习模式配置状态:', config.passiveLearningMode);
        console.log('当前配置:', {
            passiveLearningMode: config.passiveLearningMode,
            passiveLearningDensity: config.passiveLearningDensity,
            passiveLearningDisplayMode: config.passiveLearningDisplayMode,
            passiveLearningRecord: config.passiveLearningRecord,
            passiveLearningSmartDisplay: config.passiveLearningSmartDisplay,
            passiveLearningMaxWordsPerNode: config.passiveLearningMaxWordsPerNode
        });
        
        // 设置翻译配置为中文到英文
        const originalTo = config.to;
        const originalFrom = config.from;
        config.to = 'en';  // 设置目标语言为英文
        config.from = 'zh-Hans';  // 设置源语言为简体中文
        
        console.log('翻译配置已设置为:', { from: config.from, to: config.to });
        
        // 检查被动学习模式是否启用
        if (!config.passiveLearningMode) {
            console.log('被动学习模式未启用，退出初始化');
            return;
        }
        
        console.log('被动学习模式已启用，开始启动...');
        this.state.isEnabled = true;
        this.loadLearnedWords();
        
        // 临时调试：清空学习记录以便测试
        console.log('当前已学习词语数量:', this.state.learnedWords.size);
        if (this.state.learnedWords.size > 0) {
            console.log('清空学习记录以便测试...');
            this.clearLearnedWords();
        }
        
        this.startPassiveLearning();
        console.log('被动学习模式已启动');
        console.log('=== 被动学习模式初始化完成 ===');
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
        
        // 构建候选词池
        this.buildCandidateWordPool();
        
        // 添加一个测试函数来强制测试翻译
        this.testTranslation();
        
        // 处理当前页面的文本内容
        this.processPageContent();
        
        // 监听页面变化
        this.observePageChanges();
    }

    // 构建全页候选词池
    private buildCandidateWordPool() {
        console.log('构建全页候选词池...');
        this.candidateWordPool = [];
        const wordFrequency = new Map<string, { count: number, words: WordInfo[] }>();

        // 扫描全页文本节点
        const textNodes = this.getTextNodes(document.body);
        
        for (const node of textNodes) {
            const words = this.extractChineseWords(node.textContent || '', node);
            
            for (const word of words) {
                // 过滤虚词
                if (this.STOPWORDS.has(word.text)) {
                    continue;
                }
                
                // 统计频次
                if (wordFrequency.has(word.text)) {
                    const existing = wordFrequency.get(word.text)!;
                    existing.count++;
                    existing.words.push(word);
                } else {
                    wordFrequency.set(word.text, { count: 1, words: [word] });
                }
            }
        }

        // 按频次×长度×长度权重排序，优先选择短词语
        const sortedWords = Array.from(wordFrequency.entries())
            .map(([text, data]) => {
                const lengthWeight = text.length <= 4 ? 1.0 : 0.5; // 短词语权重更高
                const score = data.count * text.length * lengthWeight;
                return {
                    text,
                    count: data.count,
                    length: text.length,
                    score: score,
                    words: data.words
                };
            })
            .sort((a, b) => b.score - a.score);

        // 限制候选词池大小
        const maxPoolSize = 100;
        const selectedWords = sortedWords.slice(0, maxPoolSize);
        
        for (const wordData of selectedWords) {
            // 选择第一个出现位置的WordInfo
            this.candidateWordPool.push(wordData.words[0]);
        }

        console.log(`候选词池构建完成，共${this.candidateWordPool.length}个词语`);
        console.log('前10个候选词:', this.candidateWordPool.slice(0, 10).map(w => w.text));
        this.isWordPoolBuilt = true;
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
        
        console.log('提取中文词语 - 输入文本:', text.substring(0, 50) + '...');
        
        while ((match = this.chineseWordRegex.exec(text)) !== null) {
            const word = match[0];
            console.log('找到中文词语:', word, '长度:', word.length);
            
            // 根据长度偏好过滤词语
            const lengthPreference = config.passiveLearningWordLengthPreference || 'short';
            let maxLength = 6;
            let minLength = 2;
            
            switch (lengthPreference) {
                case 'short':
                    maxLength = 3;
                    break;
                case 'medium':
                    maxLength = 4;
                    break;
                case 'long':
                    maxLength = 6;
                    break;
            }
            
            if (word.length < minLength || word.length > maxLength) {
                console.log('词语长度不符合偏好设置，跳过:', word, '长度:', word.length, '偏好:', lengthPreference);
                continue;
            }
            
            // 检查是否在STOPWORDS中
            if (this.STOPWORDS.has(word)) {
                console.log('词语在STOPWORDS中，跳过:', word);
                continue;
            }
            
            // 过滤掉已学习的词语
            if (config.passiveLearningRecord && this.state.learnedWords.has(word)) {
                console.log('词语已学习，跳过:', word);
                continue;
            }

            console.log('词语通过所有过滤条件，添加到候选列表:', word);
            words.push({
                text: word,
                startIndex: match.index,
                endIndex: match.index + word.length,
                element: textNode.parentElement!,
                node: textNode
            });
        }

        console.log('提取完成，共找到词语数量:', words.length);
        return words;
    }

    // 根据密度选择要翻译的词语
    private selectWordsForTranslation(words: WordInfo[]): WordInfo[] {
        // 每节点最大替换数限制
        const maxWordsPerNode = config.passiveLearningMaxWordsPerNode || 1;
        
        // 从候选词池中优先选择
        const candidateWords = this.candidateWordPool.filter(candidate => 
            words.some(word => word.text === candidate.text)
        );
        
        // 如果候选词池中有匹配的词，优先选择
        if (candidateWords.length > 0) {
            const selected = candidateWords.slice(0, maxWordsPerNode);
            console.log('从候选词池选择:', selected.map(w => w.text));
            return selected;
        }
        
        // 否则从当前文本节点中选择
        const densityKey = config.passiveLearningDensity as 'light' | 'medium' | 'heavy';
        const density = this.densityConfig[densityKey] || 0.1;
        const targetCount = Math.min(maxWordsPerNode, Math.max(1, Math.floor(words.length * density)));
        
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
        
        // 智能展示策略
        const displayMode = this.getDisplayMode(wordInfo.text, translation);
        
        console.log('显示模式判断:', {
            smartDisplay: config.passiveLearningSmartDisplay,
            userDisplayMode: config.passiveLearningDisplayMode,
            finalDisplayMode: displayMode,
            originalText: wordInfo.text,
            translation: translation
        });
        
        let replacement: string;
        if (displayMode === 'bracket') {
            replacement = `${wordInfo.text}(${translation})`;
        } else {
            replacement = translation;
        }

        console.log('替换结果:', {
            before: before,
            replacement: replacement,
            after: after,
            finalText: before + replacement + after
        });

        const newText = before + replacement + after;
        textNode.textContent = newText;

        // 添加样式类
        this.addTranslationStyles(textNode.parentElement!);
    }

    // 智能展示模式判断
    private getDisplayMode(originalText: string, translation: string): 'replace' | 'bracket' {
        // 如果智能展示模式关闭，完全跟随用户设置
        if (!config.passiveLearningSmartDisplay) {
            return config.passiveLearningDisplayMode as 'replace' | 'bracket';
        }

        // 智能展示模式开启：根据翻译结果智能选择
        // 判断翻译结果是否过长
        const lengthRatio = translation.length / originalText.length;
        const isTooLong = lengthRatio > 2;
        
        // 判断翻译结果是否包含空格或特殊字符
        const hasSpaces = translation.includes(' ') || translation.includes('-') || translation.includes('_');
        
        // 如果翻译结果过长或包含特殊字符，使用括号模式
        if (isTooLong || hasSpaces) {
            return 'bracket';
        }

        // 否则使用直接替换
        return 'replace';
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
        console.log('已清空学习记录');
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
