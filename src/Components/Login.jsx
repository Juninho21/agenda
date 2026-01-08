import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Verifique seu e-mail para o link de confirmação!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Agenda</h1>
                <p className="login-subtitle">
                    {isSignUp ? 'Crie sua conta para começar' : 'Bem-vindo de volta!'}
                </p>

                {error && (
                    <div className="error-message">
                        <i className='bx bx-error-circle'></i>
                        {error === 'Invalid login credentials' ? 'Credenciais inválidas.' : error}
                    </div>
                )}

                {message && (
                    <div className="error-message" style={{ color: '#00e676', borderColor: '#00e676', background: 'rgba(0, 230, 118, 0.1)' }}>
                        <i className='bx bx-check-circle'></i>
                        {message}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ width: '100%' }}>
                    <div className="input-group">
                        <input
                            type="email"
                            className="input-field"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <i className='bx bx-envelope input-icon'></i>
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <i className='bx bx-lock-alt input-icon'></i>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? (isSignUp ? 'Criando...' : 'Entrando...') : (isSignUp ? 'Cadastrar' : 'Entrar')}
                    </button>
                </form>

                <p className="toggle-text">
                    {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                    <span
                        className="toggle-link"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setMessage(null);
                        }}
                    >
                        {isSignUp ? 'Entrar' : 'Cadastre-se'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Login;
