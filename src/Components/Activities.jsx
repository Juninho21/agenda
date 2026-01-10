import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CalendarApp.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Activities = () => {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchServiceOrders();
    }, []);

    const fetchServiceOrders = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch orders assigned to current user
            // We select *, and the related client data
            const { data, error } = await supabase
                .from('service_orders')
                .select(`
                    *,
                    clients (
                        name,
                        street,
                        number,
                        neighborhood,
                        city
                    )
                `)
                .eq('technician_id', user.id)
                .order('scheduled_at', { ascending: true });

            if (error) {
                console.error('Error fetching service orders:', error);
            } else {
                setOrders(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const { error } = await supabase
                .from('service_orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            // Refresh list
            fetchServiceOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#fff3cd', color: '#856404', label: 'Pendente' },
            in_progress: { bg: '#cce5ff', color: '#004085', label: 'Em Andamento' },
            completed: { bg: '#d4edda', color: '#155724', label: 'Concluído' },
            canceled: { bg: '#f8d7da', color: '#721c24', label: 'Cancelado' }
        };
        const s = styles[status] || styles.pending;
        return (
            <span style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                backgroundColor: s.bg,
                color: s.color,
                fontSize: '0.85rem',
                fontWeight: '600'
            }}>
                {s.label}
            </span>
        );
    };

    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'block' }}>
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto', paddingBottom: '100px' }}>
                <div className="calendar-header" style={{ justifyContent: 'center' }}>
                    <span className="month-picker">Minha Agenda (OS)</span>
                </div>

                <div style={{ padding: '1rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando...</div>
                    ) : orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <i className='bx bx-calendar-x' style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                            <p>Nenhuma Ordem de Serviço agendada.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {orders.map(order => (
                                <div key={order.id} style={{
                                    background: 'var(--bg-element)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    borderLeft: `5px solid ${order.status === 'completed' ? '#28a745' : 'var(--accent-color)'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>
                                                {order.clients?.name || 'Cliente Desconhecido'}
                                            </h3>
                                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {order.clients?.city} - {order.clients?.neighborhood}
                                            </p>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                        <i className='bx bx-time-five' style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}></i>
                                        <span style={{ fontWeight: '500' }}>
                                            {order.scheduled_at ? format(new Date(order.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Sem data'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusChange(order.id, 'in_progress')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.8rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'var(--accent-color)',
                                                    color: '#fff',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Iniciar Serviço
                                            </button>
                                        )}
                                        {order.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleStatusChange(order.id, 'completed')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.8rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: '#28a745',
                                                    color: '#fff',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Finalizar
                                            </button>
                                        )}
                                        <button style={{
                                            padding: '0.8rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--text-muted)',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}>
                                            Detalhes
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Activities;
