// 每日一句模块

let quotesData = null;

// 加载名言数据
async function loadQuotes() {
    try {
        const response = await fetch('C:\\Users\\yangdong\\Desktop\\project\\1.0.1\\quotes.json');
        quotesData = await response.json();
        return quotesData;
    } catch (e) {
        console.error('加载名言失败:', e);
        // 使用默认名言
        return {
            quotes: [
                "error:千里之行，始于足下。——老子",
                "error:不积跬步，无以至千里；不积，无以成江海。——荀子"
            ]
        };
    }
}

// 获取今日名言
function getTodayQuote(quotes) {
    const today = utils.formatDate(new Date());
    const savedDate = appState.get('lastQuoteDate');
    let currentQuote = appState.get('currentQuote');

    // 如果是新的一天或者没有保存的名言，随机选择一个
    if (savedDate !== today || !currentQuote) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        currentQuote = quotes[randomIndex];
        appState.set('lastQuoteDate', today);
        appState.set('currentQuote', currentQuote);
    }

    return currentQuote;
}

// 渲染每日一句
function renderQuote(quote) {
    const quoteText = document.getElementById('quote-text');
    if (quoteText) {
        quoteText.style.opacity = '0';
        quoteText.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            quoteText.textContent = quote;
            quoteText.style.transition = 'all 0.5s ease-out';
            quoteText.style.opacity = '1';
            quoteText.style.transform = 'translateY(0)';
        }, 100);
    }
}

// 初始化模块
async function initQuoteModule() {
    const data = await loadQuotes();
    const quote = getTodayQuote(data.quotes);
    renderQuote(quote);
}

// 监听页面加载
window.addEventListener('pageLoaded', async (e) => {
    if (e.detail.page === 'dashboard') {
        const data = quotesData || await loadQuotes();
        const quote = getTodayQuote(data.quotes);
        renderQuote(quote);
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuoteModule);
} else {
    setTimeout(initQuoteModule, 100);
}

// 暴露全局函数
window.initQuoteModule = initQuoteModule;
window.getTodayQuote = getTodayQuote;
window.loadQuotes = loadQuotes;
