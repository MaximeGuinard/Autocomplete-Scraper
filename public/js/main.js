document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeKeywordExplorer();
    initializeQuestions();
    initializeBulkAnalysis();
});

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            button.classList.add('active');
            document.getElementById(tabId).classList.remove('hidden');
        });
    });
}

function initializeKeywordExplorer() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const keywordInput = document.getElementById('keywordInput');
    const explorerResults = document.getElementById('explorerResults');

    analyzeBtn?.addEventListener('click', async () => {
        const keyword = keywordInput.value.trim();
        if (!keyword) return;

        try {
            setLoading(explorerResults);
            const response = await fetch('/api/keyword/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            explorerResults.innerHTML = `
                <div class="result-card">
                    <h3>Difficulté du mot-clé</h3>
                    <div class="difficulty-meter">
                        <div class="difficulty-value" 
                             style="width: ${data.difficulty}%; background: ${getDifficultyColor(data.difficulty)}">
                            ${Math.round(data.difficulty)}%
                        </div>
                    </div>
                    <p class="mt-4 text-sm text-gray-600">
                        Basé sur la fréquence d'utilisation et la concurrence
                    </p>
                </div>

                <div class="result-card">
                    <h3>Mots-clés associés</h3>
                    <div class="keyword-list">
                        ${data.suggestions.map(s => `
                            <div class="keyword-item">
                                <span class="keyword-text">${escapeHtml(s.keyword)}</span>
                                <span class="keyword-score">${Math.round(s.score)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="result-card">
                    <h3>Questions fréquentes</h3>
                    <div class="keyword-list">
                        ${data.questions.map(q => `
                            <div class="keyword-item">
                                <span class="keyword-text">${escapeHtml(q.question)}</span>
                                <span class="keyword-score">${q.score}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            showError(explorerResults, 'Une erreur est survenue lors de l\'analyse');
        }
    });
}

function initializeQuestions() {
    const questionBtn = document.getElementById('questionBtn');
    const questionInput = document.getElementById('questionInput');
    const questionResults = document.getElementById('questionResults');

    questionBtn?.addEventListener('click', async () => {
        const keyword = questionInput.value.trim();
        if (!keyword) return;

        try {
            setLoading(questionResults);
            const response = await fetch('/api/keyword/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            questionResults.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${data.questions.map(q => `
                        <div class="result-card">
                            <div class="keyword-item">
                                <span class="keyword-text">${escapeHtml(q.question)}</span>
                                <span class="keyword-score">${q.score}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            showError(questionResults, 'Une erreur est survenue');
        }
    });
}

function initializeBulkAnalysis() {
    const bulkAnalyzeBtn = document.getElementById('bulkAnalyzeBtn');
    const bulkKeywords = document.getElementById('bulkKeywords');
    const bulkResults = document.getElementById('bulkResults');

    bulkAnalyzeBtn?.addEventListener('click', async () => {
        const keywords = bulkKeywords.value.trim().split('\n').filter(k => k.trim());
        if (keywords.length === 0) return;
        if (keywords.length > 100) {
            showError(bulkResults, 'Maximum 100 mots-clés à la fois');
            return;
        }

        try {
            setLoading(bulkResults);
            const response = await fetch('/api/bulk/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            bulkResults.innerHTML = `
                <div class="grid grid-cols-1 gap-6">
                    ${data.results.map(result => `
                        <div class="result-card">
                            <h3>${escapeHtml(result.keyword)}</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <div class="difficulty-meter">
                                        <div class="difficulty-value" 
                                             style="width: ${result.analysis.difficulty}%; background: ${getDifficultyColor(result.analysis.difficulty)}">
                                            ${Math.round(result.analysis.difficulty)}%
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span class="text-sm text-gray-600">Suggestions: ${result.analysis.suggestions.length}</span>
                                </div>
                                <div>
                                    <span class="text-sm text-gray-600">Questions: ${result.analysis.questions.length}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            showError(bulkResults, 'Une erreur est survenue');
        }
    });
}

function setLoading(element) {
    element.innerHTML = `
        <div class="loading">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div>Analyse en cours...</div>
        </div>
    `;
}

function showError(element, message) {
    element.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function getDifficultyColor(difficulty) {
    if (difficulty < 33) return '#22c55e';
    if (difficulty < 66) return '#f59e0b';
    return '#ef4444';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}