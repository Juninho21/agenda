import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Header from './Header';
import Navbar from './Navbar';
import './CalendarApp.css'; // Ensure theme variables are available

const Layout = () => {
    const location = useLocation();
    // Move theme state here
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        // Sync theme class to body or wrapper if needed, but the wrapper div handles it
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.log('Error logging out:', error.message);
    };

    const getTitle = (pathname) => {
        if (pathname === '/') return 'Agenda';
        if (pathname === '/activities') return 'Atividades';
        if (pathname.startsWith('/settings')) return 'Configurações';
        return 'Agenda';
    };

    return (
        // Apply theme class here so it propagates to all children
        <div className={`app-layout ${theme === 'light' ? 'light-theme' : ''}`} style={{
            height: '100dvh', /* Modern mobile viewport fix */
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-primary)',
            overflow: 'hidden'
        }}>
            <div style={{ flex: '0 0 auto', zIndex: 1002 }}>
                <Header
                    title={getTitle(location.pathname)}
                    actions={[
                        {
                            icon: <i className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`}></i>,
                            onClick: toggleTheme,
                            title: "Alternar Tema"
                        },
                        {
                            icon: <i className='bx bx-log-out'></i>,
                            onClick: handleLogout,
                            title: "Sair"
                        }
                    ]}
                />
            </div>

            <div className="content-wrapper" style={{
                flex: '1 1 auto',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Outlet context={{ theme }} />
            </div>

            <div style={{ flex: '0 0 auto', zIndex: 1001 }}>
                <Navbar />
            </div>
        </div>
    );
};

export default Layout;
