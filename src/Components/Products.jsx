import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './CalendarApp.css';


const Products = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Placeholder for product data
    const [products, setProducts] = useState([]);

    const [form, setForm] = useState({
        name: '',
        activeIngredient: '',
        chemicalGroup: '',
        registrationNumber: '',
        batch: '',
        expirationDate: '',
        unit: '',
        diluent: '',
        antidote: '',
        applicationMethod: ''
    });
    const [editingId, setEditingId] = useState(null);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);



    const formatDate = (value) => {
        // Remove non-digits
        let v = value.replace(/\D/g, '');

        // Limit to 8 digits total (DDMMYYYY)
        v = v.substring(0, 8);

        // Validate Day (First 2 digits)
        if (v.length >= 2) {
            const day = parseInt(v.substring(0, 2));
            // Invalid day (00 or > 31)
            if (day > 31 || day === 0) {
                // Keep only the first digit
                v = v.substring(0, 1);
            }
        }

        // Validate Month (Next 2 digits)
        if (v.length >= 4) {
            const month = parseInt(v.substring(2, 4));
            // Invalid month (00 or > 12)
            if (month > 12 || month === 0) {
                // Keep DD and first digit of month
                v = v.substring(0, 3);
            }
        }

        // Apply Date mask: DD/MM/YYYY
        if (v.length > 4) {
            v = v.replace(/^(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
        }

        return v;
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'expirationDate') {
            value = formatDate(value);
        }
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        name: form.name,
                        active_ingredient: form.activeIngredient,
                        chemical_group: form.chemicalGroup,
                        registration_number: form.registrationNumber,
                        batch: form.batch,
                        expiration_date: form.expirationDate,
                        unit: form.unit,
                        diluent: form.diluent,
                        antidote: form.antidote,
                        application_method: form.applicationMethod
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert('Produto atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([{
                        name: form.name,
                        active_ingredient: form.activeIngredient,
                        chemical_group: form.chemicalGroup,
                        registration_number: form.registrationNumber,
                        batch: form.batch,
                        expiration_date: form.expirationDate,
                        unit: form.unit,
                        diluent: form.diluent,
                        antidote: form.antidote,
                        application_method: form.applicationMethod
                    }]);

                if (error) throw error;
                alert('Produto salvo com sucesso!');
            }

            setForm({
                name: '',
                activeIngredient: '',
                chemicalGroup: '',
                registrationNumber: '',
                batch: '',
                expirationDate: '',
                unit: '',
                diluent: '',
                antidote: '',
                applicationMethod: ''
            });
            setEditingId(null);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Erro ao salvar produto.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setForm({
            name: product.name,
            activeIngredient: product.active_ingredient,
            chemicalGroup: product.chemical_group,
            registrationNumber: product.registration_number,
            batch: product.batch,
            expirationDate: product.expiration_date,
            unit: product.unit,
            diluent: product.diluent,
            antidote: product.antidote,
            applicationMethod: product.application_method
        });
        setEditingId(product.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                fetchProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Erro ao excluir produto.');
            }
        }
    };

    return (
        <div className="calendar-app">
            {/* Header with Back Button */}
            <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 2rem' }}>
                <button
                    onClick={() => navigate('/settings')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        transition: 'background 0.3s'
                    }}
                    className="header-btn"
                >
                    <i className='bx bx-chevron-left'></i>
                </button>
                <span className="month-picker">Produtos</span>
                <div style={{ width: '40px' }}></div> {/* Spacer for alignment */}
            </div>

            <div className="calendar-content">
                <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto', padding: '2rem' }}>

                    <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>Cadastro de Produto</h3>

                        {/* Nome do Produto */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Nome do produto/concentração</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
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

                        {/* Princípio Ativo e Grupo Químico */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Princípio ativo</label>
                                <input
                                    type="text"
                                    name="activeIngredient"
                                    value={form.activeIngredient}
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
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Grupo químico</label>
                                <input
                                    type="text"
                                    name="chemicalGroup"
                                    value={form.chemicalGroup}
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

                        {/* Registro, Lote, Validade */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Registro</label>
                                <input
                                    type="text"
                                    name="registrationNumber"
                                    value={form.registrationNumber}
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
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Lote</label>
                                <input
                                    type="text"
                                    name="batch"
                                    value={form.batch}
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
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Validade</label>
                                <input
                                    type="text"
                                    name="expirationDate"
                                    value={form.expirationDate}
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

                        {/* Unidade e Diluente */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Unidade</label>
                                <select
                                    name="unit"
                                    value={form.unit}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--bg-element)',
                                        background: 'var(--bg-element)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.6rem',
                                        appearance: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="" disabled>Selecione</option>
                                    <option value="g">Gramas (g)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Diluente</label>
                                <input
                                    type="text"
                                    name="diluent"
                                    value={form.diluent}
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

                        {/* Antídoto */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Antídoto</label>
                            <input
                                type="text"
                                name="antidote"
                                value={form.antidote}
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

                        {/* Metodologia de Aplicação */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Metodologia de Aplicação</label>
                            <input
                                type="text"
                                name="applicationMethod"
                                value={form.applicationMethod}
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

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--accent-color)',
                                color: '#fff',
                                fontSize: '1.6rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)'
                            }}
                        >
                            {loading ? 'Salvando...' : 'Salvar dados do Produto'}
                        </button>

                        {/* Lista de Produtos */}
                        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--bg-element)', paddingTop: '2rem' }}>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Produtos Cadastrados</h3>

                            {products.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.4rem' }}>Nenhum produto cadastrado.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    {products.map((product) => (
                                        <div key={product.id} style={{
                                            padding: '1.5rem',
                                            background: 'var(--bg-element)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color, #eee)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.6rem', margin: 0 }}>{product.name}</h4>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{
                                                        fontSize: '1.2rem',
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '20px',
                                                        background: 'var(--accent-color)',
                                                        color: '#fff',
                                                        opacity: 0.8,
                                                    }}>
                                                        {`Validade: ${product.expiration_date}`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '1.4rem', color: 'var(--text-muted)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Princípio Ativo:</span>
                                                    {product.active_ingredient}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Lote:</span>
                                                    {product.batch}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Aplicação:</span>
                                                    {product.application_method}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Registro:</span>
                                                    {product.registration_number}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #eee)' }}>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-muted)',
                                                        fontSize: '1.8rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0.5rem',
                                                        transition: 'color 0.2s',
                                                    }}
                                                    title="Editar"
                                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                >
                                                    <i className='bx bx-pencil'></i>
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#ff4d4d',
                                                        fontSize: '1.8rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0.5rem',
                                                        opacity: 0.8,
                                                        transition: 'opacity 0.2s',
                                                    }}
                                                    title="Excluir"
                                                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                                                >
                                                    <i className='bx bx-trash'></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Products;
