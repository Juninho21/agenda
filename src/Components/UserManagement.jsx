import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseClient';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import './CalendarApp.css';

const UserManagement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [view, setView] = useState('list'); // 'list', 'create', 'edit'
    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'client' // Default role
    });

    const roles = [
        { value: 'super_user', label: 'Super Usuário' },
        { value: 'admin', label: 'Administrador' },
        { value: 'controller', label: 'Controlador de Pragas' },
        { value: 'client', label: 'Cliente' }
    ];

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            // Get profile to check role
            const docRef = doc(db, 'profiles', user.uid);
            const docSnap = await getDoc(docRef);
            const profile = docSnap.exists() ? docSnap.data() : null;

            if (!profile) {
                alert('Erro ao verificar permissões.');
                navigate('/settings');
                return;
            }

            if (profile.role !== 'super_user' && profile.role !== 'admin') {
                alert('Você não tem permissão para acessar esta página.');
                navigate('/settings');
                return;
            }

            setCurrentUserRole(profile.role);
            fetchUsers();
        } catch (error) {
            console.error('Error checking permissions:', error);
            navigate('/settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'profiles'));
            const data = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            // Firebase doesn't order by created_at by default unless we query it, but we can sort locally to keep it simple
            data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            setUsers(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!formData.email || !formData.password || !formData.name) {
            return alert('Preencha todos os campos obrigatórios (Email, Senha, Nome).');
        }

        setLoading(true);
        try {
            // Note: signUp will sign in the new user in most client configurations.
            // Ideally this should be done via a backend function (Admin API).
            // Since we are client-side only, we warn the user.

            // Attempt to create user
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const newUser = userCredential.user;

            if (newUser) {
                // Set the profile document for the new user in Firestore
                await setDoc(doc(db, 'profiles', newUser.uid), {
                    name: formData.name,
                    role: formData.role,
                    email: formData.email,
                    created_at: new Date().toISOString()
                });

                alert('Usuário cadastrado com sucesso!');

                setView('list');
                fetchUsers();

                // If signUp logged us in as the new user, we warn and log out.
                if (auth.currentUser && auth.currentUser.uid === newUser.uid) {
                    alert('Atenção: O sistema autenticou automaticamente como o novo usuário. Você precisará fazer login novamente como Admin.');
                    await signOut(auth);
                    navigate('/login');
                }
            }

        } catch (error) {
            console.error('Error creating user:', error);
            alert('Erro ao criar usuário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, 'profiles', editingUser.id), {
                name: formData.name,
                role: formData.role
            });

            alert('Usuário atualizado com sucesso!');
            setView('list');
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Erro ao atualizar usuário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação apenas remove o perfil, o login pode permanecer ativo dependendo da configuração.')) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'profiles', userId));

            alert('Perfil de usuário removido.');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Erro ao remover usuário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '', // Can't edit password directly here easily without Auth API
            name: user.name || '',
            role: user.role || 'client'
        });
        setView('edit');
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'client'
        });
        setView('create');
    };

    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'block' }}>
            <div className="calendar" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto', paddingBottom: '100px' }}>

                {/* Header */}
                <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button onClick={() => navigate('/settings')} className="header-btn" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '2rem', cursor: 'pointer' }}>
                        <i className='bx bx-chevron-left'></i>
                    </button>
                    <span className="month-picker">Gerenciar Usuários</span>
                    <div style={{ width: '40px' }}></div>
                </div>

                <div style={{ padding: '0 1rem' }}>

                    {view === 'list' && (
                        <>
                            <button
                                onClick={openCreate}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'var(--accent-color)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    marginBottom: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <i className='bx bx-user-plus'></i> Cadastrar Novo Usuário
                            </button>

                            <div className="users-list">
                                {users.map(user => (
                                    <div key={user.id} style={{
                                        background: 'var(--bg-element)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text-primary)' }}>{user.name || 'Sem nome'}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                            <span style={{
                                                marginTop: '0.5rem',
                                                display: 'inline-block',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '8px',
                                                background: 'var(--bg-color)',
                                                fontSize: '0.8rem',
                                                color: 'var(--accent-color)',
                                                fontWeight: '600',
                                                textTransform: 'uppercase'
                                            }}>
                                                {roles.find(r => r.value === user.role)?.label || user.role}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEdit(user)}
                                                style={{
                                                    background: 'rgba(var(--accent-color-rgb), 0.1)',
                                                    color: 'var(--accent-color)',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2rem'
                                                }}
                                            >
                                                <i className='bx bx-edit-alt'></i>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                style={{
                                                    background: 'rgba(255, 68, 68, 0.1)',
                                                    color: '#ff4444',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '1.2rem'
                                                }}
                                            >
                                                <i className='bx bx-trash'></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {(view === 'create' || view === 'edit') && (
                        <div className="user-form">
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.4rem' }}>
                                {view === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
                            </h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.1rem'
                                    }}
                                />
                            </div>

                            {/* Email is read-only in edit mode for simplicity */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    disabled={view === 'edit'}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--bg-element)',
                                        background: view === 'edit' ? 'var(--bg-color)' : 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.1rem',
                                        opacity: view === 'edit' ? 0.7 : 1
                                    }}
                                />
                            </div>

                            {view === 'create' && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Senha</label>
                                    <input
                                        type="text"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Defina uma senha provisória"
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.1rem'
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Permissão (Hierarquia)</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setView('list')}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        border: '1px solid var(--text-muted)',
                                        color: 'var(--text-muted)',
                                        fontSize: '1.1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={view === 'create' ? handleCreateUser : handleUpdateUser}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: 'var(--accent-color)',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {loading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
