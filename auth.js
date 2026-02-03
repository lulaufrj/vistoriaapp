// ============================================
// Authentication Module
// ============================================

window.Auth = {
    // Auto-detect API URL based on environment
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api/auth'
        : `${window.location.origin}/api/auth`,

    /**
     * Initialize Auth System
     */
    init() {
        this.checkAuth();
        this.bindEvents();
    },

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        const token = localStorage.getItem('vistoriaapp_token');
        const user = localStorage.getItem('vistoriaapp_user');

        if (token && user) {
            this.showApp();
            return true;
        } else {
            this.showLogin();
            return false;
        }
    },

    /**
     * Bind form events
     */
    bindEvents() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register Form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Switch to Register
        const toRegisterBtn = document.getElementById('toRegisterBtn');
        if (toRegisterBtn) {
            toRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegister();
            });
        }

        // Switch to Login (Generic)
        const toLoginBtns = ['toLoginBtn', 'toLoginFromRegisterBtn', 'backToLoginFromForgotBtn', 'backToLoginFromResetBtn'];
        toLoginBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLogin();
                });
            }
        });

        // Switch to Forgot Password
        const toForgotBtn = document.getElementById('toForgotBtn');
        if (toForgotBtn) {
            toForgotBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgot();
            });
        }

        // Forgot Password Form
        const forgotForm = document.getElementById('forgotPasswordForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        // Reset Password Form
        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleResetPassword();
            });
        }
    },

    /**
     * Handle Forgot Password
     */
    async handleForgotPassword() {
        const email = document.getElementById('forgotEmail').value;
        const btn = document.getElementById('forgotBtn');

        if (!email) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Enviando...';

            const response = await fetch(`${this.API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                Utils.showNotification('Código de recuperação enviado para o terminal/console', 'success');
                this.showReset(); // Go directly to input code
            } else {
                Utils.showNotification(data.error || 'Erro ao enviar email', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            Utils.showNotification('Erro de conexão', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Enviar Código';
        }
    },

    /**
     * Handle Reset Password
     */
    async handleResetPassword() {
        const token = document.getElementById('resetToken').value;
        const newPassword = document.getElementById('newPassword').value;
        const btn = document.getElementById('resetBtn');

        if (!token || !newPassword) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Salvando...';

            const response = await fetch(`${this.API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (data.success) {
                Utils.showNotification('Senha atualizada! Faça login.', 'success');
                this.showLogin();
                document.getElementById('resetPasswordForm').reset();
            } else {
                Utils.showNotification(data.error || 'Erro ao resetar senha', 'error');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            Utils.showNotification('Erro de conexão', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar Nova Senha';
        }
    },

    /**
     * Handle Login
     */
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginBtn');

        if (!email || !password) {
            Utils.showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Entrando...';

            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('vistoriaapp_token', data.token);
                localStorage.setItem('vistoriaapp_user', JSON.stringify(data.user));
                Utils.showNotification(`Bem-vindo, ${data.user.name}!`, 'success');
                this.showApp();
            } else {
                Utils.showNotification(data.error || 'Erro ao fazer login', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            Utils.showNotification('Erro de conexão com o servidor', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Entrar';
        }
    },

    /**
     * Handle Register
     */
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const btn = document.getElementById('registerBtn');

        if (!name || !email || !password) {
            Utils.showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Criando conta...';

            const response = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (data.success) {
                Utils.showNotification('Conta criada! Faça login para continuar.', 'success');
                this.showLogin();
                document.getElementById('registerForm').reset();
            } else {
                Utils.showNotification(data.error || 'Erro ao criar conta', 'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            Utils.showNotification('Erro de conexão com o servidor', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Criar Conta';
        }
    },

    /**
     * Show App / Hide Auth
     */
    showApp() {
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
    },

    /**
     * Show Login / Hide App & Register
     */
    showLogin() {
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');

        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('registerSection').classList.add('hidden');
        document.getElementById('forgotPasswordSection').classList.add('hidden');
        document.getElementById('resetPasswordSection').classList.add('hidden');
    },

    showRegister() {
        this.hideAllAuthSections();
        document.getElementById('registerSection').classList.remove('hidden');
    },

    showForgot() {
        this.hideAllAuthSections();
        document.getElementById('forgotPasswordSection').classList.remove('hidden');
    },

    showReset() {
        this.hideAllAuthSections();
        document.getElementById('resetPasswordSection').classList.remove('hidden');
    },

    hideAllAuthSections() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('registerSection').classList.add('hidden');
        document.getElementById('forgotPasswordSection').classList.add('hidden');
        document.getElementById('resetPasswordSection').classList.add('hidden');
    },

    /**
     * Show Register
     */
    /**
     * Show Register
     */
    showRegister() {
        this.hideAllAuthSections();
        document.getElementById('registerSection').classList.remove('hidden');
    },

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('vistoriaapp_token');
        localStorage.removeItem('vistoriaapp_user');
        window.location.reload();
    }
};
