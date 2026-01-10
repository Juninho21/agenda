import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './CalendarApp.css';

const Clients = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        type: 'pf', // 'pf' or 'pj'
        name: '',
        fantasyName: '',
        contactName: '',
        document: '', // CPF or CNPJ
        email: '',
        phone: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    // Fetch Clients
    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching clients:', error);
                } else {
                    const mappedData = (data || []).map(item => ({
                        ...item,
                        fantasyName: item.fantasy_name,
                        contactName: item.contact_name
                    }));
                    setClients(mappedData);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (view === 'form') {
            setView('list');
            // Reset form
            setFormData({
                type: 'pf', // 'pf' or 'pj'
                name: '',
                fantasyName: '',
                contactName: '',
                document: '', // CPF or CNPJ
                email: '',
                phone: '',
                street: '',
                number: '',
                neighborhood: '',
                city: '',
                state: ''
            });
        } else {
            navigate('/settings');
        }
    };

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'document') {
            // Masking logic based on type
            value = value.replace(/\D/g, '');
            if (formData.type === 'pf') {
                // CPF Mask: 000.000.000-00
                value = value.substring(0, 11);
                value = value.replace(/(\d{3})(\d)/, '$1.$2')
                    .replace(/(\d{3})(\d)/, '$1.$2')
                    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                    .replace(/(-\d{2})\d+?$/, '$1');
            } else {
                // CNPJ Mask: 00.000.000/0000-00
                value = value.substring(0, 14);
                value = value.replace(/^(\d{2})(\d)/, '$1.$2')
                    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1/$2')
                    .replace(/(\d{4})(\d)/, '$1-$2');
            }
        } else if (name === 'phone') {
            value = value.replace(/\D/g, '').substring(0, 11);
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 5) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
        } else if (name === 'state') {
            value = value.toUpperCase().substring(0, 2);
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            type,
            document: '' // Reset document when switching type
        }));
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Por favor, preencha o nome.');

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não logado');

            const payload = {
                user_id: user.id,
                type: formData.type,
                name: formData.name,
                fantasy_name: formData.fantasyName,
                contact_name: formData.contactName,
                document: formData.document,
                email: formData.email,
                phone: formData.phone,
                street: formData.street,
                number: formData.number,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state
            };

            const { error } = await supabase
                .from('clients')
                .insert([payload]);

            if (error) throw error;

            alert('Cliente salvo com sucesso!');
            setView('list');
            fetchClients();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Erro ao salvar cliente. Verifique se a tabela "clients" existe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'block' }}>
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto', paddingBottom: '100px' }}>

                {/* Header */}
                <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button onClick={handleBack} className="header-btn" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '2rem', cursor: 'pointer' }}>
                        <i className='bx bx-chevron-left'></i>
                    </button>
                    <span className="month-picker">{view === 'list' ? 'Clientes' : 'Novo Cliente'}</span>
                    <div style={{ width: '40px' }}></div>
                </div>

                <div style={{ padding: '0 1rem' }}>

                    {view === 'list' ? (
                        <>
                            <button
                                onClick={() => setView('form')}
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
                                <i className='bx bx-plus'></i> Adicionar Cliente
                            </button>

                            <div className="clients-list">
                                {clients.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                                        Nenhum cliente cadastrado.
                                    </div>
                                ) : (
                                    clients.map(client => (
                                        <div key={client.id} style={{
                                            background: 'var(--bg-element)',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text-primary)' }}>{client.name}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{client.document}</div>
                                            </div>
                                            <div>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '8px',
                                                    background: 'var(--bg-color)',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {client.type === 'pj' ? 'PJ' : 'PF'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="client-form">
                            {/* Type Selector */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                <button
                                    onClick={() => handleTypeChange('pf')}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        border: `2px solid ${formData.type === 'pf' ? 'var(--accent-color)' : 'var(--bg-element)'}`,
                                        background: formData.type === 'pf' ? 'rgba(var(--accent-color-rgb), 0.1)' : 'var(--bg-element)',
                                        color: formData.type === 'pf' ? 'var(--accent-color)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Pessoa Física
                                </button>
                                <button
                                    onClick={() => handleTypeChange('pj')}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        border: `2px solid ${formData.type === 'pj' ? 'var(--accent-color)' : 'var(--bg-element)'}`,
                                        background: formData.type === 'pj' ? 'rgba(var(--accent-color-rgb), 0.1)' : 'var(--bg-element)',
                                        color: formData.type === 'pj' ? 'var(--accent-color)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Pessoa Jurídica
                                </button>
                            </div>

                            {/* Name Fields */}
                            {formData.type === 'pj' ? (
                                <>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
                                            Razão Social
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            style={{
                                                width: '100%',
                                                padding: '1.2rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--bg-element)',
                                                background: 'var(--bg-element)',
                                                color: 'var(--text-primary)',
                                                fontSize: '1.6rem'
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
                                            Nome Fantasia
                                        </label>
                                        <input
                                            type="text"
                                            name="fantasyName"
                                            value={formData.fantasyName}
                                            onChange={handleChange}
                                            style={{
                                                width: '100%',
                                                padding: '1.2rem',
                                                borderRadius: '12px',
                                                border: '1px solid var(--bg-element)',
                                                background: 'var(--bg-element)',
                                                color: 'var(--text-primary)',
                                                fontSize: '1.6rem'
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '1.2rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.6rem'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Document Field */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
                                    {formData.type === 'pj' ? 'CNPJ' : 'CPF'}
                                </label>
                                <input
                                    type="text"
                                    name="document"
                                    value={formData.document}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem'
                                    }}
                                />
                            </div>

                            {/* Contact Name */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
                                    Nome do Contato
                                </label>
                                <input
                                    type="text"
                                    name="contactName"
                                    value={formData.contactName}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem'
                                    }}
                                />
                            </div>

                            {/* Contact Fields */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem'
                                    }}
                                />
                            </div>

                            {/* Address Fields */}
                            <div style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>
                                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '500' }}>Endereço</h3>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Rua / Avenida</label>
                                <input
                                    type="text"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: '0 0 30%' }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Número</label>
                                    <input
                                        type="text"
                                        name="number"
                                        value={formData.number}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '1.2rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.6rem'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Bairro</label>
                                    <input
                                        type="text"
                                        name="neighborhood"
                                        value={formData.neighborhood}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '1.2rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.6rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Cidade</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '1.2rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.6rem'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: '0 0 80px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>UF</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        maxLength={2}
                                        style={{
                                            width: '100%',
                                            padding: '1.2rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--bg-element)',
                                            background: 'var(--bg-element)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.6rem',
                                            textTransform: 'uppercase'
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    background: 'var(--accent-color)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '1.6rem',
                                    fontWeight: '600',
                                    cursor: loading ? 'wait' : 'pointer',
                                    marginTop: '1rem'
                                }}
                            >
                                {loading ? 'Salvando...' : 'Salvar Cliente'}
                            </button>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Clients;
