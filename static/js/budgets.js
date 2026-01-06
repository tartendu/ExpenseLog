let allBudgets = [];
let allExpenses = [];

document.addEventListener('DOMContentLoaded', function() {
    loadBudgets();
    loadExpenses();

    document.getElementById('overallBudgetForm').addEventListener('submit', handleSetOverallBudget);
    document.getElementById('budgetForm').addEventListener('submit', handleSetBudget);
});

async function loadBudgets() {
    try {
        const response = await fetch('/api/budgets');
        const data = await response.json();

        if (data.success) {
            allBudgets = data.budgets;
            displayBudgets(allBudgets);
        }
    } catch (error) {
        console.error('Error loading budgets:', error);
    }
}

async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (data.success) {
            allExpenses = data.expenses;
            if (allBudgets.length > 0) {
                displayBudgets(allBudgets);
            }
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

function displayBudgets(budgets) {
    const budgetListContainer = document.getElementById('budgetList');
    const overallBudget = budgets.find(b => b.category === 'Overall');
    const categoryBudgets = budgets.filter(b => b.category !== 'Overall');

    // Display overall budget info
    if (overallBudget) {
        const monthlyTotal = calculateMonthlyTotal();
        const percentage = (monthlyTotal / overallBudget.amount) * 100;
        const isOverBudget = percentage > 100;

        document.getElementById('overallBudgetInput').value = overallBudget.amount;

        // Add overall budget display at the top of the list
        const overallCard = `
            <div class="budget-card overall-budget-card ${isOverBudget ? 'over-budget' : ''}">
                <div class="budget-card-header">
                    <div class="budget-category-name">
                        <span class="budget-icon">🎯</span>
                        <h3>Overall Monthly Budget</h3>
                    </div>
                </div>
                <div class="budget-card-body">
                    <div class="budget-amounts">
                        <div class="budget-stat">
                            <span class="label">Budget</span>
                            <span class="value">${formatCurrency(overallBudget.amount)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="label">Spent</span>
                            <span class="value ${isOverBudget ? 'text-danger' : ''}">${formatCurrency(monthlyTotal)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="label">Remaining</span>
                            <span class="value ${isOverBudget ? 'text-danger' : 'text-success'}">${formatCurrency(overallBudget.amount - monthlyTotal)}</span>
                        </div>
                    </div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar">
                            <div class="budget-progress-fill" style="width: ${Math.min(percentage, 100)}%; background-color: ${isOverBudget ? 'var(--danger-color)' : 'var(--primary-color)'}"></div>
                        </div>
                        <span class="budget-percentage ${isOverBudget ? 'text-danger' : ''}">${percentage.toFixed(1)}%</span>
                    </div>
                    ${isOverBudget ? '<p class="over-budget-warning">⚠️ Over budget!</p>' : ''}
                </div>
            </div>
            <h3 style="margin: 30px 0 15px 0; color: var(--text-dark);">Category Budgets</h3>
        `;

        budgetListContainer.innerHTML = overallCard;
    } else {
        budgetListContainer.innerHTML = '';
    }

    if (categoryBudgets.length === 0) {
        budgetListContainer.innerHTML += '<p class="empty-state">No category budgets set yet. Start by setting a budget!</p>';
        return;
    }

    budgetListContainer.innerHTML += categoryBudgets.map(budget => {
        const spent = calculateCategorySpent(budget.category);
        const percentage = (spent / budget.amount) * 100;
        const isOverBudget = percentage > 100;

        return `
            <div class="budget-card ${isOverBudget ? 'over-budget' : ''}">
                <div class="budget-card-header">
                    <div class="budget-category-name">
                        <span class="budget-icon">${getCategoryIcon(budget.category)}</span>
                        <h3>${budget.category}</h3>
                    </div>
                    <button class="btn btn-delete-small" onclick="deleteBudget('${budget.id}')">×</button>
                </div>
                <div class="budget-card-body">
                    <div class="budget-amounts">
                        <div class="budget-stat">
                            <span class="label">Budget</span>
                            <span class="value">${formatCurrency(budget.amount)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="label">Spent</span>
                            <span class="value ${isOverBudget ? 'text-danger' : ''}">${formatCurrency(spent)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="label">Remaining</span>
                            <span class="value ${isOverBudget ? 'text-danger' : 'text-success'}">${formatCurrency(budget.amount - spent)}</span>
                        </div>
                    </div>
                    <div class="budget-progress-container">
                        <div class="budget-progress-bar">
                            <div class="budget-progress-fill" style="width: ${Math.min(percentage, 100)}%; background-color: ${isOverBudget ? 'var(--danger-color)' : 'var(--primary-color)'}"></div>
                        </div>
                        <span class="budget-percentage ${isOverBudget ? 'text-danger' : ''}">${percentage.toFixed(1)}%</span>
                    </div>
                    ${isOverBudget ? '<p class="over-budget-warning">⚠️ Over budget!</p>' : ''}
                </div>
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

async function handleSetOverallBudget(e) {
    e.preventDefault();

    const formData = {
        category: 'Overall',
        amount: document.getElementById('overallBudgetInput').value,
        period: 'monthly'
    };

    try {
        const response = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Overall budget set successfully!');
            loadBudgets();
        } else {
            showError(data.error || 'Failed to set overall budget');
        }
    } catch (error) {
        console.error('Error setting overall budget:', error);
        showError('Failed to set overall budget');
    }
}

async function handleSetBudget(e) {
    e.preventDefault();

    const formData = {
        category: document.getElementById('budgetCategory').value,
        amount: document.getElementById('budgetAmount').value,
        period: 'monthly'
    };

    try {
        const response = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Category budget set successfully!');
            document.getElementById('budgetForm').reset();
            loadBudgets();
        } else {
            showError(data.error || 'Failed to set budget');
        }
    } catch (error) {
        console.error('Error setting budget:', error);
        showError('Failed to set budget');
    }
}

async function deleteBudget(budgetId) {
    if (!confirm('Are you sure you want to delete this budget?')) {
        return;
    }

    try {
        const response = await fetch(`/api/budgets/${budgetId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Budget deleted successfully!');
            loadBudgets();
        } else {
            showError(data.error || 'Failed to delete budget');
        }
    } catch (error) {
        console.error('Error deleting budget:', error);
        showError('Failed to delete budget');
    }
}
