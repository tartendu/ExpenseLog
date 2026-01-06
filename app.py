import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from dotenv import load_dotenv
from firebase_config import get_firebase_config
from auth_helper import login_required, verify_token, get_current_user
from database import ExpenseDB, BudgetDB
from datetime import datetime, timedelta
import json

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key-change-this')

@app.route('/')
def index():
    """Home page - redirect to dashboard if logged in"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    """Login page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    firebase_config = get_firebase_config()
    return render_template('login.html', firebase_config=json.dumps(firebase_config))

@app.route('/register')
def register():
    """Register page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    firebase_config = get_firebase_config()
    return render_template('register.html', firebase_config=json.dumps(firebase_config))

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """Handle login with Firebase token"""
    try:
        data = request.get_json()
        id_token = data.get('idToken')

        if not id_token:
            return jsonify({'success': False, 'error': 'No token provided'}), 400

        decoded_token = verify_token(id_token)

        if decoded_token:
            session['user_id'] = decoded_token['uid']
            session['email'] = decoded_token.get('email')
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        else:
            return jsonify({'success': False, 'error': 'Invalid token'}), 401

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard overview"""
    user = get_current_user()
    return render_template('pages/dashboard_overview.html', user=user)

@app.route('/expenses')
@login_required
def expenses_page():
    """Expenses management page"""
    user = get_current_user()
    return render_template('pages/expenses.html', user=user)

@app.route('/budgets')
@login_required
def budgets_page():
    """Budgets management page"""
    user = get_current_user()
    return render_template('pages/budgets.html', user=user)

@app.route('/reports')
@login_required
def reports_page():
    """Reports and analytics page"""
    user = get_current_user()
    return render_template('pages/reports.html', user=user)

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    """Get user expenses"""
    user = get_current_user()
    expenses = ExpenseDB.get_user_expenses(user['user_id'])

    for expense in expenses:
        if 'created_at' in expense:
            expense['created_at'] = expense['created_at'].isoformat()
        if 'updated_at' in expense:
            expense['updated_at'] = expense['updated_at'].isoformat()

    return jsonify({'success': True, 'expenses': expenses})

@app.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    """Add new expense"""
    try:
        user = get_current_user()
        data = request.get_json()

        required_fields = ['amount', 'date', 'category', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400

        expense_data = {
            'amount': float(data['amount']),
            'date': data['date'],
            'category': data['category'],
            'payment_method': data['payment_method'],
            'notes': data.get('notes', '')
        }

        result = ExpenseDB.add_expense(user['user_id'], expense_data)

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<expense_id>', methods=['PUT'])
@login_required
def update_expense(expense_id):
    """Update expense"""
    try:
        user = get_current_user()
        data = request.get_json()

        update_data = {}
        if 'amount' in data:
            update_data['amount'] = float(data['amount'])
        if 'date' in data:
            update_data['date'] = data['date']
        if 'category' in data:
            update_data['category'] = data['category']
        if 'payment_method' in data:
            update_data['payment_method'] = data['payment_method']
        if 'notes' in data:
            update_data['notes'] = data['notes']

        result = ExpenseDB.update_expense(expense_id, user['user_id'], update_data)

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """Delete expense"""
    try:
        user = get_current_user()
        result = ExpenseDB.delete_expense(expense_id, user['user_id'])

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/budgets', methods=['GET'])
@login_required
def get_budgets():
    """Get user budgets"""
    user = get_current_user()
    budgets = BudgetDB.get_user_budgets(user['user_id'])

    for budget in budgets:
        if 'created_at' in budget:
            budget['created_at'] = budget['created_at'].isoformat()
        if 'updated_at' in budget:
            budget['updated_at'] = budget['updated_at'].isoformat()

    return jsonify({'success': True, 'budgets': budgets})

@app.route('/api/budgets', methods=['POST'])
@login_required
def set_budget():
    """Set or update budget"""
    try:
        user = get_current_user()
        data = request.get_json()

        if 'category' not in data or 'amount' not in data:
            return jsonify({'success': False, 'error': 'Category and amount required'}), 400

        result = BudgetDB.set_budget(
            user['user_id'],
            data['category'],
            data['amount'],
            data.get('period', 'monthly')
        )

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/budgets/<budget_id>', methods=['DELETE'])
@login_required
def delete_budget(budget_id):
    """Delete budget"""
    try:
        user = get_current_user()
        result = BudgetDB.delete_budget(budget_id, user['user_id'])

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/summary')
@login_required
def get_summary():
    """Get expense summary"""
    try:
        user = get_current_user()
        expenses = ExpenseDB.get_user_expenses(user['user_id'])

        total_expenses = sum(expense['amount'] for expense in expenses)

        category_totals = {}
        payment_method_totals = {}
        for expense in expenses:
            category = expense['category']
            payment_method = expense.get('payment_method', 'Unknown')
            category_totals[category] = category_totals.get(category, 0) + expense['amount']
            payment_method_totals[payment_method] = payment_method_totals.get(payment_method, 0) + expense['amount']

        today = datetime.now().date()
        start_of_month = today.replace(day=1)
        month_expenses = [exp for exp in expenses if datetime.fromisoformat(exp['date']).date() >= start_of_month]
        monthly_total = sum(exp['amount'] for exp in month_expenses)

        days_in_month = (datetime.now().date() - start_of_month).days + 1
        daily_average = monthly_total / days_in_month if days_in_month > 0 else 0

        return jsonify({
            'success': True,
            'summary': {
                'total_expenses': total_expenses,
                'monthly_total': monthly_total,
                'category_breakdown': category_totals,
                'payment_method_breakdown': payment_method_totals,
                'expense_count': len(expenses),
                'daily_average': daily_average
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
