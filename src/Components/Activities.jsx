import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import './CalendarApp.css';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const deviceTypes = {
    'Porta Isca': ['Conforme', 'Mofada', 'Consumida', 'Deteriorada', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
    'Placa Adesiva': ['Conforme', 'Refil Substituído', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
    'Armadilha Mecânica': ['Conforme', 'Desarmada', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
    'Armadilha Luminosa': ['Conforme', 'Refil Substituído', 'Desligada', 'Lâmpada Queimada', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
    'Armadilha Biológica': ['Conforme', 'Atrativo Biológico Substituído', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
    'Armadilha de Feromônio': ['Conforme', 'Refil Substituído', 'Dispositivo Obstruído', 'Dispositivo Danificado', 'Sem Dispositivo', 'Praga Encontrada', 'Novo Dispositivo'],
};

const Activities = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [view, setView] = useState('list'); // 'list', 'execution'
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Execution State
    const [activeOS, setActiveOS] = useState(null);
    const [activeTab, setActiveTab] = useState('checkin'); // checkin, devices, products, evidence

    // List of completed services in this session
    const [savedServices, setSavedServices] = useState([]);

    // OS Data (Current Service Form)
    const [osData, setOsData] = useState({
        checkIn: null, // Check-in is global for the OS/Visit
        checkOut: null,
        devices: [],
        products: [],
        evidences: [],
        observations: '',
        serviceType: '',
        targetPest: '',
        location: '',
        totalDevices: 0
    });

    // Device Form State
    const [currentDevice, setCurrentDevice] = useState({ type: 'Porta Isca', status: '', selectedNumbers: [] });
    // Product Form State
    const [currentProduct, setCurrentProduct] = useState({ name: '', quantity: '', unit: 'ml' });

    // Lists State
    const [serviceTypeList, setServiceTypeList] = useState(['Inspeção', 'Monitoramento', 'Pulverização', 'Atomização', 'Termonebulização', 'Polvilhamento', 'Iscagem com Gel', 'Implantação']);
    const [targetPestList, setTargetPestList] = useState(['Roedores', 'Moscas', 'Mosquitos', 'Baratas', 'Formigas', 'Aranhas', 'Traças']);
    const [locationList, setLocationList] = useState(['Área Interna', 'Área Externa']);
    const [productsList, setProductsList] = useState([]);

    useEffect(() => {
        fetchProducts(); // Fetch registered products
        // If passed via navigation state, start execution immediately
        // If passed via navigation state, start execution immediately
        if (location.state && location.state.clientName) {
            startExecutionFromState(location.state);
        } else {
            fetchServiceOrders();
        }
    }, [location.state]);

    const startExecutionFromState = (state) => {
        setActiveOS({
            id: state.eventId || 'temp-id',
            clientName: state.clientName,
            address: 'Endereço do Cliente (Carregar)', // In real app, fetch this
            description: state.description
        });

        // Auto Check-in
        setOsData(prev => ({ ...prev, checkIn: new Date() }));

        setView('execution');
        setActiveTab('service');
    };

    // Helper to add new items to lists
    const handleAddItem = (setter, list) => {
        const newItem = prompt("Digite o novo item:");
        if (newItem && !list.includes(newItem)) {
            setter(prev => [...prev, newItem]);
        }
    };

    const fetchServiceOrders = async () => {
        setLoading(true);
        // Mocking for UI dev - In future, fetch from Supabase
        setTimeout(() => {
            setOrders([]); // Leave empty or mock
            setLoading(false);
        }, 500);
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            setProductsList(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleCheckIn = () => {
        setOsData(prev => ({ ...prev, checkIn: new Date() }));
    };

    const handleCheckOut = () => {
        setOsData(prev => ({ ...prev, checkOut: new Date() }));
    };

    const handleAddDevice = () => {
        if (!currentDevice.type || !currentDevice.status || currentDevice.selectedNumbers.length === 0) return alert('Selecione tipo, status e pelo menos um dispositivo');

        // Upsert: iterator over selected numbers
        setOsData(prev => {
            let newDevices = [...prev.devices];

            currentDevice.selectedNumbers.forEach(num => {
                const existingIndex = newDevices.findIndex(d => d.number === num);
                const newDeviceEntry = {
                    type: currentDevice.type,
                    status: currentDevice.status,
                    number: num,
                    id: existingIndex >= 0 ? newDevices[existingIndex].id : Date.now() + Math.random() // Keep ID if exists
                };

                if (existingIndex >= 0) {
                    newDevices[existingIndex] = newDeviceEntry;
                } else {
                    newDevices.push(newDeviceEntry);
                }
            });

            return {
                ...prev,
                devices: newDevices
            };
        });

        // Clear selection and status
        setCurrentDevice(prev => ({ ...prev, status: '', selectedNumbers: [] }));
    };

    const handleAddProduct = () => {
        if (!currentProduct.name || !currentProduct.quantity) return alert('Preencha nome e quantidade');
        const selectedProduct = productsList.find(p => p.name === currentProduct.name);
        setOsData(prev => ({
            ...prev,
            products: [...prev.products, { ...currentProduct, ...selectedProduct, id: Date.now() }] // Merge manual quantity with full product details
        }));
        setCurrentProduct({ name: '', quantity: '', unit: 'ml' });
    };

    const handleSaveService = () => {
        if (!osData.serviceType || !osData.targetPest || !osData.location) {
            return alert('Preencha pelo menos: Tipo de Serviço, Praga Alvo e Local.');
        }

        // Logic to auto-fill missing devices as "Conforme"
        let finalDevices = [...osData.devices];
        if (osData.totalDevices > 0) {
            for (let i = 1; i <= osData.totalDevices; i++) {
                const numStr = i.toString();
                const exists = finalDevices.some(d => d.number === numStr);

                if (!exists) {
                    finalDevices.push({
                        id: Date.now() + Math.random(),
                        number: numStr,
                        type: currentDevice.type, // Use currently selected type
                        status: 'Conforme'
                    });
                }
            }
        }

        // Optional: Sort by number for clean storage
        finalDevices.sort((a, b) => parseInt(a.number) - parseInt(b.number));

        const newService = {
            id: Date.now(),
            serviceType: osData.serviceType,
            targetPest: osData.targetPest,
            location: osData.location,
            devices: finalDevices,
            products: [...osData.products],
            evidences: [...osData.evidences],
            observations: osData.observations
        };

        setSavedServices(prev => [...prev, newService]);

        // Reset form for next service, BUT keep global checkIn
        setOsData(prev => ({
            ...prev,
            devices: [],
            products: [],
            evidences: [],
            observations: '',
            serviceType: '',
            targetPest: '',
            location: '',
            totalDevices: 0
        }));

        // Reset local states
        setCurrentDevice({ type: 'Porta Isca', status: '', selectedNumbers: [] });
        setCurrentProduct({ name: '', quantity: '', unit: 'ml' });

        alert('Serviço salvo! Você pode adicionar outro serviço para esta OS.');
        setActiveTab('service'); // Return to first tab
    };

    const handleDeleteService = (id) => {
        if (window.confirm('Excluir este serviço salvo?')) {
            setSavedServices(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleEditService = (service) => {
        // Check if current form has data that would be lost
        if (osData.serviceType || osData.targetPest || osData.location) {
            if (!window.confirm('Existem dados não salvos no formulário atual. Se continuar, eles serão perdidos. Deseja editar este serviço?')) {
                return;
            }
        }

        // Load data back to form
        setOsData(prev => ({
            ...prev,
            serviceType: service.serviceType,
            targetPest: service.targetPest,
            location: service.location,
            devices: service.devices,
            products: service.products,
            evidences: service.evidences,
            observations: service.observations
        }));

        // Remove from list (effectively "moving to draft")
        setSavedServices(prev => prev.filter(s => s.id !== service.id));
    };

    const handleFinishOS = () => {
        // If there is data in the form that hasn't been saved to list, ask or save it?
        // For now, let's assume 'Finalizar' sends everything: savedServices + current form (if partial)
        // OR better: ensure user explicitly saved the service.
        // Let's check if the current form has content.

        // If savedServices is empty AND current form is empty-ish -> Warning
        // If savedServices has items, we can ignore empty form.
        // If savedServices has items AND current form has data -> Ask to save?

        // Simplification for now: If user modified form, we might want to auto-save or warn.
        // But per request "Salvar Serviço" is the explicit action. 
        // We will just process 'savedServices'. 

        // WAIT: If the user entered data but didn't click "Save Service" and clicks "Finish", 
        // they might expect it to count.
        // Let's do a quick check: if fields are filled, treat as one last service.
        let finalServices = [...savedServices];
        if (osData.serviceType && osData.targetPest) {
            const currentService = {
                id: Date.now(),
                serviceType: osData.serviceType,
                targetPest: osData.targetPest,
                location: osData.location,
                devices: osData.devices,
                products: osData.products,
                evidences: osData.evidences,
                observations: osData.observations
            };
            finalServices.push(currentService);
        }

        if (finalServices.length === 0) {
            return alert('Nenhum serviço registrado. Preencha os dados e clique em Salvar Serviço.');
        }

        if (!osData.checkOut) {
            handleCheckOut(); // Auto checkout if forgot
        }

        console.log('Finalizing OS:', { activeOS, checkIn: osData.checkIn, checkOut: new Date(), services: finalServices });
        alert(`OS Finalizada com ${finalServices.length} serviço(s)!`);
        navigate('/'); // Go back to calendar
    };

    const renderTabButton = (id, label, icon) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: activeTab === id ? 'var(--accent-color)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--text-secondary)',
                borderBottom: activeTab === id ? 'none' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem'
            }}
        >
            <i className={`bx ${icon}`} style={{ fontSize: '1.2rem' }}></i>
            {label}
        </button>
    );

    if (view === 'execution' && activeOS) {
        return (
            <div className="calendar-app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
                {/* Header */}
                <div style={{ padding: '15px', background: 'var(--bg-element)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className='bx bx-arrow-back' style={{ fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => navigate('/')}></i>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Execução de Serviço
                            {osData.checkIn && <span style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 'normal' }}>{format(osData.checkIn, 'HH:mm')}</span>}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}><b>{activeOS.clientName}</b></p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'var(--bg-element)', marginTop: '2px', borderBottom: '1px solid #ddd' }}>
                    {renderTabButton('service', 'Serviço', 'bx-clipboard')}
                    {renderTabButton('devices', 'Dispositivos', 'bx-target-lock')}
                    {renderTabButton('products', 'Produtos', 'bx-spray-can')}
                    {renderTabButton('evidence', 'NC', 'bx-camera')}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>

                    {/* Tab: Service Info */}
                    {activeTab === 'service' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {savedServices.length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Serviços Salvos ({savedServices.length})</h3>
                                    {savedServices.map((service, index) => (
                                        <div key={service.id} style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid var(--accent-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{service.serviceType}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{format(service.id, 'HH:mm')}</div>
                                                    <i
                                                        className='bx bx-pencil'
                                                        style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.3rem' }}
                                                        onClick={() => handleEditService(service)}
                                                        title="Editar"
                                                    ></i>
                                                    <i
                                                        className='bx bx-trash'
                                                        style={{ cursor: 'pointer', color: '#ff4d4d', fontSize: '1.3rem' }}
                                                        onClick={() => handleDeleteService(service.id)}
                                                        title="Excluir"
                                                    ></i>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                {service.targetPest} em {service.location}
                                            </div>
                                            {(service.products.length > 0 || service.devices.length > 0) && (
                                                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                                                    {/* Products */}
                                                    {service.products.length > 0 && (
                                                        <div style={{ marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                                <strong style={{ display: 'block' }}>Produtos:</strong>
                                                                <span style={{
                                                                    background: '#e0e7ff',
                                                                    color: 'var(--accent-color)',
                                                                    padding: '3px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 'bold',
                                                                    border: '1px solid var(--accent-color)'
                                                                }}>
                                                                    {service.products.length} Total
                                                                </span>
                                                            </div>
                                                            {service.products.map((p, idx) => (
                                                                <div key={idx} style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                                                                    • {p.name} <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>({p.quantity} {p.unit})</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Devices Breakdown */}
                                                    {service.devices.length > 0 && (
                                                        <div style={{ marginTop: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <strong style={{ display: 'block' }}>Dispositivos:</strong>
                                                                <span style={{
                                                                    background: '#e0e7ff',
                                                                    color: 'var(--accent-color)',
                                                                    padding: '3px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 'bold',
                                                                    border: '1px solid var(--accent-color)'
                                                                }}>
                                                                    {service.devices.length} Total
                                                                </span>
                                                            </div>
                                                            {Object.entries(service.devices.reduce((acc, dev) => {
                                                                if (!acc[dev.type]) acc[dev.type] = {};
                                                                if (!acc[dev.type][dev.status]) acc[dev.type][dev.status] = [];
                                                                acc[dev.type][dev.status].push(dev.number);
                                                                return acc;
                                                            }, {})).map(([type, statusGroups]) => (
                                                                <div key={type} style={{ marginLeft: '8px', marginBottom: '2px' }}>
                                                                    <span style={{ color: 'var(--text-primary)' }}>{type}:</span>
                                                                    {Object.entries(statusGroups).map(([status, nums]) => {
                                                                        const percentage = Math.round((nums.length / service.devices.length) * 100);
                                                                        return (
                                                                            <div key={status} style={{ marginLeft: '8px' }}>
                                                                                <span style={{ color: 'var(--text-secondary)' }}>{status} ({percentage}%): </span>
                                                                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                                                                                    {nums.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Service Type */}
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Tipo de Serviço</h4>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={osData.serviceType || ''}
                                        onChange={(e) => setOsData(prev => ({ ...prev, serviceType: e.target.value }))}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione...</option>
                                        {serviceTypeList.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <button onClick={() => handleAddItem(setServiceTypeList, serviceTypeList)} style={{ padding: '0 15px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>

                            {/* Target Pest */}
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Praga Alvo</h4>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={osData.targetPest || ''}
                                        onChange={(e) => setOsData(prev => ({ ...prev, targetPest: e.target.value }))}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione...</option>
                                        {targetPestList.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <button onClick={() => handleAddItem(setTargetPestList, targetPestList)} style={{ padding: '0 15px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>

                            {/* Location */}
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Local / Setor</h4>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={osData.location || ''}
                                        onChange={(e) => setOsData(prev => ({ ...prev, location: e.target.value }))}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione...</option>
                                        {locationList.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <button onClick={() => handleAddItem(setLocationList, locationList)} style={{ padding: '0 15px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Tab: Devices */}
                    {activeTab === 'devices' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>

                                {/* Device Type Selector - Moved Top */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px' }}>Tipo de Dispositivo</label>
                                    <select
                                        value={currentDevice.type}
                                        onChange={(e) => setCurrentDevice(prev => ({ ...prev, type: e.target.value, status: '' }))}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        {Object.keys(deviceTypes).map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>

                                {/* Total Devices Input */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px' }}>Quantidade total de dispositivos</label>
                                    <input
                                        type="number"
                                        value={osData.totalDevices || ''}
                                        onChange={(e) => setOsData(prev => ({ ...prev, totalDevices: parseInt(e.target.value) || 0 }))}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                {/* Status Selector - Moved Here */}
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px' }}>Status</label>
                                    <select
                                        value={currentDevice.status}
                                        onChange={(e) => setCurrentDevice(prev => ({ ...prev, status: e.target.value }))}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione o Status</option>
                                        {currentDevice.type && deviceTypes[currentDevice.type] ? (
                                            deviceTypes[currentDevice.type].map(status => <option key={status} value={status}>{status}</option>)
                                        ) : (
                                            <option value="" disabled>Selecione um tipo primeiro</option>
                                        )}
                                    </select>
                                </div>

                                {/* Grid */}
                                {osData.totalDevices > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <i className='bx bx-bug'></i> Dispositivos Disponíveis
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px' }}>
                                            {Array.from({ length: osData.totalDevices }, (_, i) => i + 1).map((num) => {
                                                const isRecorded = osData.devices.some(d => d.number === num.toString());
                                                const isSelected = currentDevice.selectedNumbers.includes(num.toString());

                                                return (
                                                    <button
                                                        key={num}
                                                        onClick={() => setCurrentDevice(prev => {
                                                            const numStr = num.toString();
                                                            const newSelection = prev.selectedNumbers.includes(numStr)
                                                                ? prev.selectedNumbers.filter(n => n !== numStr)
                                                                : [...prev.selectedNumbers, numStr];
                                                            return { ...prev, selectedNumbers: newSelection };
                                                        })}
                                                        style={{
                                                            padding: '8px 0',
                                                            borderRadius: '6px',
                                                            border: '1px solid',
                                                            borderColor: isRecorded ? '#ffcccc' : (isSelected ? 'var(--accent-color)' : '#dae1e7'),
                                                            background: isRecorded ? '#ffe6e6' : (isSelected ? '#e6f7ff' : '#f0f4f8'),
                                                            color: isRecorded ? '#cc0000' : (isSelected ? 'var(--accent-color)' : '#4a5568'),
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        {num}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                                    {currentDevice.selectedNumbers.length > 0 ? `Configurar ${currentDevice.selectedNumbers.length} Dispositivo(s)` : 'Selecione dispositivos no grid acima'}
                                </h4>
                                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', opacity: currentDevice.selectedNumbers.length > 0 ? 1 : 0.5, pointerEvents: currentDevice.selectedNumbers.length > 0 ? 'auto' : 'none' }}>

                                    <button onClick={handleAddDevice} style={{ padding: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        Salvar Dispositivos ({currentDevice.selectedNumbers.length})
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {/* Group devices by Type, then by Status */}
                                {Object.entries(osData.devices.reduce((acc, device) => {
                                    if (!acc[device.type]) acc[device.type] = {};
                                    if (!acc[device.type][device.status]) acc[device.type][device.status] = [];
                                    acc[device.type][device.status].push(device.number);
                                    return acc;
                                }, {})).map(([type, statusGroups]) => (
                                    <div key={type} style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '5px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{type}</h4>
                                            <i
                                                className='bx bx-trash'
                                                style={{ color: '#ff4d4d', cursor: 'pointer', fontSize: '1.2rem' }}
                                                onClick={() => {
                                                    if (window.confirm(`Remover TODOS os dispositivos do tipo ${type}?`)) {
                                                        setOsData(prev => ({
                                                            ...prev,
                                                            devices: prev.devices.filter(d => d.type !== type)
                                                        }));
                                                    }
                                                }}
                                                title={`Remover todos de ${type}`}
                                            ></i>
                                        </div>

                                        {Object.entries(statusGroups).map(([status, numbers]) => {
                                            const sortedNumbers = numbers.sort((a, b) => parseInt(a) - parseInt(b));
                                            return (
                                                <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px', background: 'var(--bg-color)', borderRadius: '6px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status}</div>
                                                        <div style={{ color: 'var(--accent-color)', fontSize: '0.95rem', fontWeight: 'bold', wordBreak: 'break-all', marginTop: '2px' }}>
                                                            {sortedNumbers.join(', ')}
                                                        </div>
                                                    </div>
                                                    <i
                                                        className='bx bx-x'
                                                        style={{ color: '#999', cursor: 'pointer', fontSize: '1.3rem', marginLeft: '10px' }}
                                                        onClick={() => {
                                                            if (window.confirm(`Remover status "${status}" de ${type}?`)) {
                                                                setOsData(prev => ({
                                                                    ...prev,
                                                                    devices: prev.devices.filter(d => !(d.type === type && d.status === status))
                                                                }));
                                                            }
                                                        }}
                                                        title={`Remover status ${status}`}
                                                    ></i>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                {osData.devices.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum dispositivo registrado.</p>}
                            </div>
                        </div>
                    )}

                    {/* Tab: Products */}
                    {activeTab === 'products' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Registrar Produto</h4>
                                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                    <select
                                        value={currentProduct.name}
                                        onChange={(e) => setCurrentProduct(prev => ({ ...prev, name: e.target.value }))}
                                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Selecione o Produto</option>
                                        {productsList.map(prod => (
                                            <option key={prod.id} value={prod.name}>{prod.name} ({prod.unit})</option>
                                        ))}
                                    </select>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="number"
                                            placeholder="Qtd"
                                            value={currentProduct.quantity}
                                            onChange={(e) => setCurrentProduct(prev => ({ ...prev, quantity: e.target.value }))}
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                        />
                                        <select
                                            value={currentProduct.unit}
                                            onChange={(e) => setCurrentProduct(prev => ({ ...prev, unit: e.target.value }))}
                                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', width: '80px', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="ml">ml</option>
                                            <option value="l">l</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="un">un</option>
                                        </select>
                                    </div>
                                    <button onClick={handleAddProduct} style={{ padding: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        + Adicionar
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {osData.products.map((prod, idx) => (
                                    <div key={idx} style={{
                                        padding: '1.5rem',
                                        background: 'var(--bg-element)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color, #eee)',
                                        marginBottom: '10px',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0 }}>{prod.name}</h4>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.9rem',
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '20px',
                                                    background: 'var(--accent-color)',
                                                    color: '#fff',
                                                    opacity: 1,
                                                    fontWeight: 'bold'
                                                }}>
                                                    Usado: {prod.quantity}{prod.unit}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Princípio Ativo:</span>
                                                {prod.active_ingredient || '-'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Lote:</span>
                                                {prod.batch || '-'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Validade:</span>
                                                <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{prod.expiration_date || '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Registro:</span>
                                                {prod.registration_number || '-'}
                                            </div>
                                        </div>

                                        <i className='bx bx-trash'
                                            style={{
                                                position: 'absolute',
                                                bottom: '10px',
                                                right: '10px',
                                                color: '#ff4d4d',
                                                cursor: 'pointer',
                                                fontSize: '1.5rem'
                                            }}
                                            onClick={() => setOsData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== prod.id) }))}
                                        ></i>
                                    </div>
                                ))}
                                {osData.products.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum produto registrado.</p>}
                            </div>
                        </div>
                    )}

                    {/* Tab: Evidence/Finish */}
                    {activeTab === 'evidence' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Relatório de Não Conformidade</h4>
                                <textarea
                                    placeholder="Descreva observações, não conformidades ou detalhes do serviço..."
                                    rows="5"
                                    value={osData.observations}
                                    onChange={(e) => setOsData(prev => ({ ...prev, observations: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', resize: 'vertical', background: 'var(--bg-color)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                                ></textarea>
                            </div>

                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Evidências Fotográficas</h4>
                                <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                                    <i className='bx bx-camera' style={{ fontSize: '2rem', color: 'var(--text-muted)' }}></i>
                                    <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)' }}>Toque para tirar foto ou enviar arquivo</p>
                                    <input type="file" multiple accept="image/*" style={{ display: 'none' }} />
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Persistent Footer Actions */}
                <div style={{ padding: '15px', background: 'var(--bg-element)', borderTop: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={handleSaveService}
                        style={{
                            padding: '12px',
                            background: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <i className='bx bx-save'></i> Salvar Serviço
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => alert('Aprovação da OS solicitada')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#fd7e14',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <i className='bx bx-check-double'></i> Aprovar
                        </button>

                        <button
                            onClick={handleFinishOS}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <i className='bx bx-check-circle'></i> Finalizar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default View (List of scheduled OS) - "Minha Agenda"
    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-primary)' }}>Minha Agenda</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Ordens de serviço atribuídas</p>
            </div>

            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <i className='bx bx-list-check' style={{ fontSize: '4rem', color: 'var(--text-muted)' }}></i>
                <p style={{ color: 'var(--text-muted)' }}>Selecione um agendamento no calendário para iniciar.</p>
                <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                    Voltar ao Calendário
                </button>
            </div>
        </div>
    );
};

export default Activities;
