import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <ul className="navbar-list">
                <li className="navbar-item">
                    <NavLink
                        to="/"
                        className={({ isActive }) => isActive ? "navbar-link active" : "navbar-link"}
                        end
                    >
                        <i className='bx bx-calendar'></i>
                        <span>Agenda</span>
                    </NavLink>
                </li>
                <li className="navbar-item">
                    <NavLink
                        to="/activities"
                        className={({ isActive }) => isActive ? "navbar-link active" : "navbar-link"}
                    >
                        <i className='bx bx-list-ul'></i>
                        <span>Atividade</span>
                    </NavLink>
                </li>
                <li className="navbar-item">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => isActive ? "navbar-link active" : "navbar-link"}
                    >
                        <i className='bx bx-cog'></i>
                        <span>Configurações</span>
                    </NavLink>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;
