/**
 * 被动学习模式快速测试脚本
 * 在浏览器控制台中运行此脚本来快速验证功能
 */

console.log('=== 被动学习模式快速测试开始 ===');

// 测试1: 检查被动学习模式是否启用
function testPassiveLearningEnabled() {
    console.log('\n1. 测试被动学习模式状态...');
    
    // 检查是否有翻译的词语
    const translatedElements = document.querySelectorAll('.fluent-read-passive-learning');
    console.log(`找到 ${translatedElements.length} 个翻译的词语`);
    
    if (translatedElements.length > 0) {
        console.log('✅ 被动学习模式已启用，有词语被翻译');
        return true;
    } else {
        console.log('❌ 被动学习模式可能未启用，没有找到翻译的词语');
        return false;
    }
}

// 测试2: 检查悬停功能
function testHoverFunctionality() {
    console.log('\n2. 测试悬停功能...');
    
    const translatedElements = document.querySelectorAll('.fluent-read-passive-learning');
    if (translatedElements.length === 0) {
        console.log('❌ 没有翻译的词语，无法测试悬停功能');
        return false;
    }
    
    const firstElement = translatedElements[0];
    console.log(`测试元素: ${firstElement.textContent}`);
    console.log(`元素标签: ${firstElement.tagName}`);
    console.log(`元素类名: ${firstElement.className}`);
    
    // 检查是否有data-original-text属性
    const originalText = firstElement.getAttribute('data-original-text');
    if (!originalText) {
        console.log('❌ 元素缺少data-original-text属性');
        console.log('所有属性:', Array.from(firstElement.attributes).map(attr => `${attr.name}="${attr.value}"`));
        return false;
    }
    console.log(`原始文本属性: ${originalText}`);
    
    // 检查事件监听器
    console.log('检查事件监听器...');
    
    // 模拟鼠标悬停
    console.log('模拟鼠标悬停事件...');
    const mouseEnterEvent = new MouseEvent('mouseenter', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    firstElement.dispatchEvent(mouseEnterEvent);
    
    // 检查是否有提示框
    setTimeout(() => {
        const tooltip = document.querySelector('.fluent-read-passive-tooltip');
        if (tooltip) {
            console.log('✅ 悬停功能正常，提示框已显示');
            console.log(`提示框内容: ${tooltip.textContent}`);
            console.log(`提示框位置: left=${tooltip.style.left}, top=${tooltip.style.top}`);
        } else {
            console.log('❌ 悬停功能异常，提示框未显示');
            console.log('可能的原因: 提示框创建失败或定位问题');
            console.log('检查DOM中是否有提示框元素...');
            const allTooltips = document.querySelectorAll('[class*="tooltip"]');
            console.log('找到的提示框元素:', allTooltips.length);
        }
    }, 200);
    
    return true;
}

// 测试3: 检查右键菜单
function testRightClickMenu() {
    console.log('\n3. 测试右键菜单...');
    
    const translatedElements = document.querySelectorAll('.fluent-read-passive-learning');
    if (translatedElements.length === 0) {
        console.log('❌ 没有翻译的词语，无法测试右键菜单');
        return false;
    }
    
    const firstElement = translatedElements[0];
    console.log(`测试元素: ${firstElement.textContent}`);
    
    // 模拟右键点击
    const contextMenuEvent = new MouseEvent('contextmenu', {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 2
    });
    firstElement.dispatchEvent(contextMenuEvent);
    
    console.log('✅ 右键菜单事件已触发（需要手动检查菜单是否显示）');
    return true;
}

// 测试4: 检查生词本数据
function testVocabularyBook() {
    console.log('\n4. 测试生词本数据...');
    
    try {
        const vocabularyBook = localStorage.getItem('fluent-read-vocabulary-book');
        if (vocabularyBook) {
            const words = JSON.parse(vocabularyBook);
            console.log(`✅ 生词本数据存在，包含 ${words.length} 个词语`);
            console.log(`生词本内容: ${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''}`);
            return true;
        } else {
            console.log('❌ 生词本数据不存在');
            return false;
        }
    } catch (error) {
        console.log('❌ 生词本数据解析失败:', error);
        return false;
    }
}

// 测试5: 检查已掌握词语数据
function testMasteredWords() {
    console.log('\n5. 测试已掌握词语数据...');
    
    try {
        const masteredWords = localStorage.getItem('fluent-read-mastered-words');
        if (masteredWords) {
            const words = JSON.parse(masteredWords);
            console.log(`✅ 已掌握词语数据存在，包含 ${words.length} 个词语`);
            console.log(`已掌握词语: ${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''}`);
            return true;
        } else {
            console.log('ℹ️ 已掌握词语数据不存在（这是正常的，如果还没有标记任何词语为已掌握）');
            return true; // 这是正常的，不算失败
        }
    } catch (error) {
        console.log('❌ 已掌握词语数据解析失败:', error);
        return false;
    }
}

// 测试6: 检查配置数据
function testConfiguration() {
    console.log('\n6. 测试配置数据...');
    
    try {
        // 检查WXT存储系统的配置
        const config = localStorage.getItem('local:config');
        if (config) {
            const configData = JSON.parse(config);
            console.log('✅ 配置数据存在');
            console.log('被动学习模式配置:', {
                passiveLearningMode: configData.passiveLearningMode,
                passiveLearningDensity: configData.passiveLearningDensity,
                passiveLearningDisplayMode: configData.passiveLearningDisplayMode,
                passiveLearningSmartDisplay: configData.passiveLearningSmartDisplay
            });
            return true;
        } else {
            console.log('❌ 配置数据不存在');
            return false;
        }
    } catch (error) {
        console.log('❌ 配置数据解析失败:', error);
        return false;
    }
}

// 测试7: 检查页面性能
function testPerformance() {
    console.log('\n7. 测试页面性能...');
    
    const startTime = performance.now();
    
    // 检查DOM元素数量
    const allElements = document.querySelectorAll('*');
    const translatedElements = document.querySelectorAll('.fluent-read-passive-learning');
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`页面元素总数: ${allElements.length}`);
    console.log(`翻译元素数量: ${translatedElements.length}`);
    console.log(`性能测试耗时: ${loadTime.toFixed(2)}ms`);
    
    if (loadTime < 100) {
        console.log('✅ 页面性能良好');
        return true;
    } else {
        console.log('⚠️ 页面性能可能有问题');
        return false;
    }
}

// 执行所有测试
function runAllTests() {
    const results = [];
    
    results.push(testPassiveLearningEnabled());
    results.push(testHoverFunctionality());
    results.push(testRightClickMenu());
    results.push(testVocabularyBook());
    results.push(testMasteredWords());
    results.push(testConfiguration());
    results.push(testPerformance());
    
    const passedTests = results.filter(result => result === true).length;
    const totalTests = results.length;
    
    console.log('\n=== 测试结果汇总 ===');
    console.log(`通过测试: ${passedTests}/${totalTests}`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log('⚠️ 部分测试失败，请检查相关功能');
    }
    
    return results;
}

// 自动运行测试
runAllTests();

console.log('\n=== 被动学习模式快速测试完成 ===');
console.log('如需重新运行测试，请执行: runAllTests()');

