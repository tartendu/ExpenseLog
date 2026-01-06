let allExpenses = [];
let allBudgets = [];

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();

    const quickForm = document.getElementById('quickExpenseForm');
    if (quickForm) {
        quickForm.addEventListener('submit', handleQuickExpense);
    }
});

async function loadDashboardData() {
    await Promise.all([
        loadSummary(),
        loadRecentExpenses(),
        loadBudgetOverview()
    ]);
}

async function loadSummary() {
    try {
        const response = await fetch('/api/reports/summary');
        const data = await response.json();

        if (data.success) {
            const summary = data.summary;

            document.getElementById('totalExpenses').textContent = formatCurrency(summary.total_expenses);
            document.getElementById('monthlyTotal').textContent = formatCurrency(summary.monthly_total);
            document.getElementById('expenseCount').textContent = summary.expense_count;

            displayCategoryBreakdown(summary.category_breakdown);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadRecentExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (data.success) {
            allExpenses = data.expenses;
            displayRecentExpenses(allExpenses.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function displayRecentExpenses(expenses) {
    const listContainer = document.getElementById('recentExpensesList');

    if (expenses.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense!</p>';
        return;
    }

    listContainer.innerHTML = expenses.map(expense => `
        <div class="recent-expense-item">
            <div class="expense-icon">${getCategoryIcon(expense.category)}</div>
            <div class="expense-details">
                <span class="expense-category">${expense.category}</span>
                <span class="expense-date">${formatDate(expense.date)}</span>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
        </div>
    `).join('');
}

async function loadBudgetOverview() {
    try {
        const response = await fetch('/api/budgets');
        const data = await response.json();

        if (data.success) {
            allBudgets = data.budgets;
            displayBudgetOverview(allBudgets);
        }
    } catch (error) {
        console.error('Error loading budgets:', error);
    }
}

function displayBudgetOverview(budgets) {
    const container = document.getElementById('budgetOverview');
    const overallBudget = budgets.find(b => b.category === 'Overall');

    if (overallBudget) {
        document.getElementById('overallBudgetAmount').textContent = formatCurrency(overallBudget.amount);
    } else {
        // If no overall budget is set, show "Not Set" message
        document.getElementById('overallBudgetAmount').textContent = 'Not Set';
        document.getElementById('overallBudgetAmount').style.fontSize = '1.5rem';
    }

    const categoryBudgets = budgets.filter(b => b.category !== 'Overall').slice(0, 3);

    if (categoryBudgets.length === 0) {
        container.innerHTML = '<p class="empty-state">No category budgets set. Set budgets for specific categories to track spending by category.</p>';
        return;
    }

    container.innerHTML = categoryBudgets.map(budget => {
        const spent = calculateCategorySpent(budget.category);
        const percentage = (spent / budget.amount) * 100;

        return `
            <div class="budget-overview-item">
                <div class="budget-header">
                    <span class="budget-category">${getCategoryIcon(budget.category)} ${budget.category}</span>
                    <span class="budget-percentage ${percentage > 100 ? 'over-budget' : ''}">${percentage.toFixed(0)}%</span>
                </div>
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%; background-color: ${percentage > 100 ? 'var(--danger-color)' : 'var(--primary-color)'}"></div>
                    </div>
                </div>
                <div class="budget-amounts">
                    <span>${formatCurrency(spent)} / ${formatCurrency(budget.amount)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function displayCategoryBreakdown(categoryBreakdown) {
    const breakdownDiv = document.getElementById('categoryBreakdown');

    if (Object.keys(categoryBreakdown).length === 0) {
        breakdownDiv.innerHTML = '<p class="empty-state">No expenses to show breakdown.</p>';
        return;
    }

    const sortedCategories = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);

    breakdownDiv.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = (amount / total) * 100;
        return `
            <div class="category-breakdown-item">
                <div class="category-info">
                    <span class="category-icon">${getCategoryIcon(category)}</span>
                    <span class="category-name">${category}</span>
                </div>
                <div class="category-bar-container">
                    <div class="category-bar" style="width: ${percentage}%"></div>
                </div>
                <span class="category-amount">${formatCurrency(amount)}</span>
            </div>
        `;
    }).join('');
}

function calculateMonthlyTotal() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allExpenses
        .filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startOfMonth;
        })
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

function calculateCategorySpent(category) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allExpenses
        .filter(expense => {
            const expenseDate = new Date(expense.date);
            return expense.category === category && expenseDate >= startOfMonth;
        })
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

async function handleQuickExpense(e) {
    e.preventDefault();

    const today = new Date().toISOString().split('T')[0];
    const formData = {
        amount: document.getElementById('quickAmount').value,
        date: today,
        category: document.getElementById('quickCategory').value,
        payment_method: 'Cash',
        notes: 'Quick expense entry'
    };

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Quick expense added successfully!');
            document.getElementById('quickExpenseForm').reset();
            loadDashboardData();
        } else {
            showError(data.error || 'Failed to add expense');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        showError('Failed to add expense');
    }
}

// Helper functions
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍔',
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

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'danger');
}

function showNotification(message, type) {
    const flashContainer = document.querySelector('.flash-messages') || createFlashContainer();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    flashContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.body.appendChild(container);
    return container;
}
