import React from 'react';
import { Link } from 'react-router-dom';
import './CalendarApp.css'; // Reusing general styles

const Settings = () => {
    return (
        <div className="calendar-app">
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto' }}>
                <div className="calendar-header" style={{ justifyContent: 'center' }}>
                    <span className="month-picker">Configurações</span>
                </div>
                <div style={{ padding: '2rem' }}>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--text-muted)', paddingBottom: '0.5rem' }}>Geral</h3>

                        <Link to="/settings/company" style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-element)', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className='bx bx-building-house' style={{ fontSize: '2.4rem', color: 'var(--accent-color)' }}></i>
                                    <span style={{ color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '500' }}>Dados da Empresa</span>
                                </div>
                                <i className='bx bx-chevron-right' style={{ color: 'var(--text-muted)', fontSize: '2.4rem' }}></i>
                            </div>
                        </Link>

                        <Link to="/settings/products" style={{ textDecoration: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--bg-element)', borderRadius: '12px', marginBottom: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <i className='bx bx-package' style={{ fontSize: '2.4rem', color: 'var(--accent-color)' }}></i>
                                    <span style={{ color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '500' }}>Produtos</span>
                                </div>
                                <i className='bx bx-chevron-right' style={{ color: 'var(--text-muted)', fontSize: '2.4rem' }}></i>
                            </div>
                        </Link>
                    </div>



                </div>
            </div>
        </div>
    );
};

export default Settings;
