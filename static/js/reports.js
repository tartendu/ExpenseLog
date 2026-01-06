let allExpenses = [];
let allBudgets = [];
let currentPeriod = 'daily';

// Chart instances
let spendingTrendChart = null;
let categoryPieChart = null;
let paymentMethodChart = null;
let topCategoriesChart = null;
let categoryComparisonChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadReportsData();
    setupTimePeriodTabs();
});

function setupTimePeriodTabs() {
    const tabs = document.querySelectorAll('.time-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            updateChartsByPeriod();
        });
    });
}

async function loadReportsData() {
    await Promise.all([
        loadSummary(),
        loadExpenses(),
        loadBudgets()
    ]);
}

async function loadSummary() {
    try {
        const response = await fetch('/api/reports/summary');
        const data = await response.json();

        if (data.success) {
            const summary = data.summary;

            document.getElementById('reportTotalExpenses').textContent = formatCurrency(summary.total_expenses);
            document.getElementById('reportMonthlyTotal').textContent = formatCurrency(summary.monthly_total);
            document.getElementById('reportDailyAverage').textContent = formatCurrency(summary.daily_average);
            document.getElementById('reportTransactionCount').textContent = summary.expense_count;
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (data.success) {
            allExpenses = data.expenses;
            initializeCharts();
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function loadBudgets() {
    try {
        const response = await fetch('/api/budgets');
        const data = await response.json();

        if (data.success) {
            allBudgets = data.budgets;
        }
    } catch (error) {
        console.error('Error loading budgets:', error);
    }
}

function initializeCharts() {
    createSpendingTrendChart();
    createCategoryPieChart();
    createPaymentMethodChart();
    createTopCategoriesChart();
    createCategoryComparisonChart();
}

function updateChartsByPeriod() {
    // Update chart titles
    const periodTitles = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'yearly': 'Yearly'
    };

    document.getElementById('trendChartTitle').textContent = `${periodTitles[currentPeriod]} Spending Trend`;
    document.getElementById('categoryComparisonTitle').textContent = `Category Comparison - ${periodTitles[currentPeriod]}`;

    // Recreate charts with new period
    createSpendingTrendChart();
    createCategoryComparisonChart();
}

function createSpendingTrendChart() {
    const ctx = document.getElementById('spendingTrendChart').getContext('2d');

    if (spendingTrendChart) {
        spendingTrendChart.destroy();
    }

    const { labels, data } = getSpendingTrendData(currentPeriod);

    spendingTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending Amount',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createCategoryPieChart() {
    const ctx = document.getElementById('categoryPieChart').getContext('2d');

    if (categoryPieChart) {
        categoryPieChart.destroy();
    }

    const categoryData = getCategoryBreakdown();

    if (categoryData.labels.length === 0) {
        ctx.canvas.parentNode.innerHTML = '<p class="empty-state" style="text-align: center; padding: 2rem;">No data available</p>';
        return;
    }

    categoryPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(237, 100, 166, 0.8)',
                    'rgba(255, 154, 158, 0.8)',
                    'rgba(250, 208, 196, 0.8)',
                    'rgba(154, 236, 219, 0.8)',
                    'rgba(115, 221, 252, 0.8)',
                    'rgba(255, 199, 95, 0.8)',
                    'rgba(165, 177, 194, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createPaymentMethodChart() {
    const ctx = document.getElementById('paymentMethodChart').getContext('2d');

    if (paymentMethodChart) {
        paymentMethodChart.destroy();
    }

    const paymentData = getPaymentMethodBreakdown();

    if (paymentData.labels.length === 0) {
        ctx.canvas.parentNode.innerHTML = '<p class="empty-state" style="text-align: center; padding: 2rem;">No data available</p>';
        return;
    }

    paymentMethodChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: paymentData.labels,
            datasets: [{
                data: paymentData.values,
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(33, 150, 243, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(156, 39, 176, 0.8)',
                    'rgba(233, 30, 99, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createTopCategoriesChart() {
    const ctx = document.getElementById('topCategoriesChart').getContext('2d');

    if (topCategoriesChart) {
        topCategoriesChart.destroy();
    }

    const categoryData = getCategoryBreakdown();

    if (categoryData.labels.length === 0) {
        ctx.canvas.parentNode.innerHTML = '<p class="empty-state" style="text-align: center; padding: 2rem;">No data available</p>';
        return;
    }

    // Sort and take top 5
    const sorted = categoryData.labels.map((label, index) => ({
        label: label,
        value: categoryData.values[index]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    topCategoriesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(item => item.label),
            datasets: [{
                label: 'Spending Amount',
                data: sorted.map(item => item.value),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(237, 100, 166, 0.8)',
                    'rgba(255, 154, 158, 0.8)',
                    'rgba(250, 208, 196, 0.8)'
                ],
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.x.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createCategoryComparisonChart() {
    const ctx = document.getElementById('categoryComparisonChart').getContext('2d');

    if (categoryComparisonChart) {
        categoryComparisonChart.destroy();
    }

    const comparisonData = getCategoryComparisonData(currentPeriod);

    if (comparisonData.labels.length === 0) {
        ctx.canvas.parentNode.innerHTML = '<p class="empty-state" style="text-align: center; padding: 2rem;">No data available</p>';
        return;
    }

    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(237, 100, 166, 0.8)',
        'rgba(255, 154, 158, 0.8)',
        'rgba(154, 236, 219, 0.8)',
        'rgba(115, 221, 252, 0.8)',
        'rgba(255, 199, 95, 0.8)'
    ];

    const datasets = comparisonData.categories.map((category, index) => ({
        label: category,
        data: comparisonData.data[category],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.8', '1'),
        borderWidth: 2,
        fill: false,
        tension: 0.4
    }));

    categoryComparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: comparisonData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ₹' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Data processing functions
function getSpendingTrendData(period) {
    const now = new Date();
    let labels = [];
    let data = [];

    if (period === 'daily') {
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const dayExpenses = allExpenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.toDateString() === date.toDateString();
            });

            const total = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            data.push(total);
        }
    } else if (period === 'weekly') {
        // Last 12 weeks
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            labels.push(`Week ${12 - i}`);

            const weekExpenses = allExpenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate >= weekStart && expenseDate <= weekEnd;
            });

            const total = weekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            data.push(total);
        }
    } else if (period === 'monthly') {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

            const monthExpenses = allExpenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === month.getMonth() &&
                       expenseDate.getFullYear() === month.getFullYear();
            });

            const total = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            data.push(total);
        }
    } else if (period === 'yearly') {
        // Last 5 years
        const currentYear = now.getFullYear();
        for (let i = 4; i >= 0; i--) {
            const year = currentYear - i;
            labels.push(year.toString());

            const yearExpenses = allExpenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getFullYear() === year;
            });

            const total = yearExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            data.push(total);
        }
    }

    return { labels, data };
}

function getCategoryBreakdown() {
    const categoryTotals = {};

    allExpenses.forEach(expense => {
        const category = expense.category;
        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }
        categoryTotals[category] += parseFloat(expense.amount);
    });

    return {
        labels: Object.keys(categoryTotals),
        values: Object.values(categoryTotals)
    };
}

function getPaymentMethodBreakdown() {
    const methodTotals = {};

    allExpenses.forEach(expense => {
        const method = expense.payment_method;
        if (!methodTotals[method]) {
            methodTotals[method] = 0;
        }
        methodTotals[method] += parseFloat(expense.amount);
    });

    return {
        labels: Object.keys(methodTotals),
        values: Object.values(methodTotals)
    };
}

function getCategoryComparisonData(period) {
    const now = new Date();
    const categoryData = {};
    let labels = [];

    // Get top 5 categories
    const categoryTotals = getCategoryBreakdown();
    const topCategories = Object.keys(categoryTotals)
        .map(cat => ({ category: cat, total: categoryTotals.values[categoryTotals.labels.indexOf(cat)] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(item => item.category);

    // Initialize data structure
    topCategories.forEach(category => {
        categoryData[category] = [];
    });

    if (period === 'daily') {
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            topCategories.forEach(category => {
                const dayExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.toDateString() === date.toDateString() &&
                           expense.category === category;
                });

                const total = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                categoryData[category].push(total);
            });
        }
    } else if (period === 'weekly') {
        // Last 12 weeks
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            labels.push(`Week ${12 - i}`);

            topCategories.forEach(category => {
                const weekExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate >= weekStart && expenseDate <= weekEnd &&
                           expense.category === category;
                });

                const total = weekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                categoryData[category].push(total);
            });
        }
    } else if (period === 'monthly') {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(month.toLocaleDateString('en-US', { month: 'short' }));

            topCategories.forEach(category => {
                const monthExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === month.getMonth() &&
                           expenseDate.getFullYear() === month.getFullYear() &&
                           expense.category === category;
                });

                const total = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                categoryData[category].push(total);
            });
        }
    } else if (period === 'yearly') {
        // Last 5 years
        const currentYear = now.getFullYear();
        for (let i = 4; i >= 0; i--) {
            const year = currentYear - i;
            labels.push(year.toString());

            topCategories.forEach(category => {
                const yearExpenses = allExpenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getFullYear() === year &&
                           expense.category === category;
                });

                const total = yearExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                categoryData[category].push(total);
            });
        }
    }

    return {
        labels: labels,
        categories: topCategories,
        data: categoryData
    };
}

// Helper functions
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍽️',
        'Transportation': '🚗',
        'Petrol': '⛽',
        'Shopping': '🛍️',
        'Entertainment': '🎬',
        'Bills': '📄',
        'Healthcare': '🏥',
        'Education': '📚',
        'Other': '📌'
    };
    return icons[category] || '📌';
}

function getPaymentMethodIcon(method) {
    const icons = {
        'Cash': '💵',
        'Credit Card': '💳',
        'Debit Card': '💳',
        'UPI': '📱',
        'Bank Transfer': '🏦'
    };
    return icons[method] || '💰';
}
