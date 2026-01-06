let allExpenses = [];
let allBudgets = [];

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    loadExpenses();
    loadBudgets();
    loadSummary();

    document.getElementById('expenseForm').addEventListener('submit', handleAddExpense);
    document.getElementById('budgetForm').addEventListener('submit', handleSetBudget);
    document.getElementById('overallBudgetForm').addEventListener('submit', handleSetOverallBudget);
    document.getElementById('editExpenseForm').addEventListener('submit', handleEditExpense);

    document.getElementById('searchExpenses').addEventListener('input', filterExpenses);
    document.getElementById('filterCategory').addEventListener('change', filterExpenses);

    document.querySelector('.modal-close').addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    });
});

async function loadExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const data = await response.json();

        if (data.success) {
            allExpenses = data.expenses;
            displayExpenses(allExpenses);
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showError('Failed to load expenses');
    }
}

function displayExpenses(expenses) {
    const expensesList = document.getElementById('expensesList');

    if (expenses.length === 0) {
        expensesList.innerHTML = '<p class="loading">No expenses found. Start by adding your first expense!</p>';
        return;
    }

    expensesList.innerHTML = expenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <h4>${expense.category}</h4>
                <p>${formatDate(expense.date)}</p>
                <p>${expense.payment_method}</p>
                ${expense.notes ? `<p><em>${expense.notes}</em></p>` : ''}
            </div>
            <div class="expense-amount">₹${parseFloat(expense.amount).toFixed(2)}</div>
            <div class="expense-category category-${expense.category}">${expense.category}</div>
            <div class="expense-actions">
                <button class="btn btn-edit" onclick="openEditModal('${expense.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteExpense('${expense.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterExpenses() {
    const searchTerm = document.getElementById('searchExpenses').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;

    let filtered = allExpenses;

    if (searchTerm) {
        filtered = filtered.filter(expense =>
            expense.category.toLowerCase().includes(searchTerm) ||
            expense.notes.toLowerCase().includes(searchTerm) ||
            expense.payment_method.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter) {
        filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    displayExpenses(filtered);
}

async function handleAddExpense(e) {
    e.preventDefault();

    const formData = {
        amount: document.getElementById('amount').value,
        date: document.getElementById('date').value,
        category: document.getElementById('category').value,
        payment_method: document.getElementById('paymentMethod').value,
        notes: document.getElementById('notes').value
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
            showSuccess('Expense added successfully!');
            document.getElementById('expenseForm').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            loadExpenses();
            loadSummary();
        } else {
            showError(data.error || 'Failed to add expense');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        showError('Failed to add expense');
    }
}

function openEditModal(expenseId) {
    const expense = allExpenses.find(exp => exp.id === expenseId);

    if (expense) {
        document.getElementById('editExpenseId').value = expense.id;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editDate').value = expense.date;
        document.getElementById('editCategory').value = expense.category;
        document.getElementById('editPaymentMethod').value = expense.payment_method;
        document.getElementById('editNotes').value = expense.notes || '';

        document.getElementById('editModal').style.display = 'block';
    }
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditExpense(e) {
    e.preventDefault();

    const expenseId = document.getElementById('editExpenseId').value;
    const formData = {
        amount: document.getElementById('editAmount').value,
        date: document.getElementById('editDate').value,
        category: document.getElementById('editCategory').value,
        payment_method: document.getElementById('editPaymentMethod').value,
        notes: document.getElementById('editNotes').value
    };

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Expense updated successfully!');
            closeModal();
            loadExpenses();
            loadSummary();
        } else {
            showError(data.error || 'Failed to update expense');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showError('Failed to update expense');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Expense deleted successfully!');
            loadExpenses();
            loadSummary();
        } else {
            showError(data.error || 'Failed to delete expense');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showError('Failed to delete expense');
    }
}

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

function displayBudgets(budgets) {
    const budgetList = document.getElementById('budgetList');

    const overallBudget = budgets.find(b => b.category === 'Overall');
    const categoryBudgets = budgets.filter(b => b.category !== 'Overall');

    if (overallBudget) {
        const monthlyTotal = calculateMonthlyTotal();
        const percentage = (monthlyTotal / overallBudget.amount) * 100;
        const isOverBudget = percentage > 100;

        document.getElementById('overallBudgetCard').style.display = 'block';
        document.getElementById('overallBudgetAmount').textContent = `₹${parseFloat(overallBudget.amount).toFixed(2)}`;
        document.getElementById('overallBudgetStatus').innerHTML = `
            <span style="font-size: 0.85rem; color: ${isOverBudget ? 'var(--danger-color)' : 'var(--secondary-color)'};">
                Spent: ₹${monthlyTotal.toFixed(2)} (${percentage.toFixed(1)}%)
                ${isOverBudget ? ' - Over Budget!' : ''}
            </span>
        `;
        document.getElementById('overallBudgetInput').value = overallBudget.amount;
    } else {
        document.getElementById('overallBudgetCard').style.display = 'none';
    }

    if (categoryBudgets.length === 0) {
        budgetList.innerHTML = '<p class="loading" style="padding: 20px 0; font-size: 0.9rem;">No category budgets set yet.</p>';
        return;
    }

    budgetList.innerHTML = categoryBudgets.map(budget => {
        const spent = calculateCategorySpent(budget.category);
        const percentage = (spent / budget.amount) * 100;
        const isOverBudget = percentage > 100;

        return `
            <div class="budget-item">
                <div class="budget-item-info">
                    <h4>${budget.category}</h4>
                    <p>Budget: ₹${parseFloat(budget.amount).toFixed(2)} | Spent: ₹${spent.toFixed(2)} (${percentage.toFixed(1)}%)</p>
                    ${isOverBudget ? '<p style="color: var(--danger-color); font-weight: 600;">Over budget!</p>' : ''}
                </div>
                <button class="btn btn-delete" onclick="deleteBudget('${budget.id}')">Delete</button>
            </div>
        `;
    }).join('');
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

async function loadSummary() {
    try {
        const response = await fetch('/api/reports/summary');
        const data = await response.json();

        if (data.success) {
            const summary = data.summary;

            document.getElementById('totalExpenses').textContent = `₹${summary.total_expenses.toFixed(2)}`;
            document.getElementById('monthlyTotal').textContent = `₹${summary.monthly_total.toFixed(2)}`;
            document.getElementById('expenseCount').textContent = summary.expense_count;

            displayCategoryBreakdown(summary.category_breakdown);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function displayCategoryBreakdown(categoryBreakdown) {
    const breakdownDiv = document.getElementById('categoryBreakdown');

    if (Object.keys(categoryBreakdown).length === 0) {
        breakdownDiv.innerHTML = '<p class="loading">No expenses to show breakdown.</p>';
        return;
    }

    const sortedCategories = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1]);

    breakdownDiv.innerHTML = sortedCategories.map(([category, amount]) => `
        <div class="category-item">
            <span class="category-item-name">${category}</span>
            <span class="category-item-amount">₹${amount.toFixed(2)}</span>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
