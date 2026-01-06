from firebase_admin import auth
from functools import wraps
from flask import session, redirect, url_for, flash

def verify_token(id_token):
    """Verify Firebase ID token"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """Get current user from session"""
    if 'user_id' in session:
        return {
            'user_id': session['user_id'],
            'email': session.get('email')
        }
    return None
