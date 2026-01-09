import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ title, showBackButton = false, actions = [] }) => {
    const navigate = useNavigate();

    return (
        <header className="app-header">
            <div className="header-left">
                {showBackButton && (
                    <button className="header-icon-btn" onClick={() => navigate(-1)}>
                        <i className='bx bx-arrow-back'></i>
                    </button>
                )}
                <h1 className="header-title">{title}</h1>
            </div>
            <div className="header-actions">
                {actions.map((action, index) => (
                    <button
                        key={index}
                        className="header-icon-btn"
                        onClick={action.onClick}
                        title={action.title}
                    >
                        {action.icon}
                    </button>
                ))}
            </div>
        </header>
    );
};

export default Header;
