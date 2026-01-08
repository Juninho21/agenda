import React from 'react';
import './CalendarApp.css'; // Reusing general styles

const Activities = () => {
    return (
        <div className="calendar-app">
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto' }}>
                <div className="calendar-header" style={{ justifyContent: 'center' }}>
                    <span className="month-picker">Atividades Recentes</span>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className='bx bx-list-check' style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                    <p>Seu histórico de atividades aparecerá aqui.</p>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-element)', borderRadius: '10px' }}>
                        <p>Em breve...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Activities;
