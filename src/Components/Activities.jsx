import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import './CalendarApp.css';
import { format } from 'date-fns';

import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SignaturePad from './SignaturePad';

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
    const [currentScreen, setCurrentScreen] = useState('home'); // home, devices, products, evidence, pests, summary
    const [activeTab, setActiveTab] = useState('checkin'); // Deprecated but kept for compatibility logic if needed, will rely on currentScreen

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
    const [currentDevice, setCurrentDevice] = useState({ type: '', status: '', selectedNumbers: [] });
    // Product Form State
    const [currentProduct, setCurrentProduct] = useState({ name: '', quantity: '', unit: 'ml' });

    // Signature State
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureData, setSignatureData] = useState(null);
    const [tempSignature, setTempSignature] = useState(null);

    // Company Settings for PDF
    const [companySettings, setCompanySettings] = useState(null);

    // Pest Count State
    const [showPestCountModal, setShowPestCountModal] = useState(false);
    const [currentCountingDevice, setCurrentCountingDevice] = useState(null); // { serviceId, deviceId, deviceNumber, ... }
    const [pestCountForm, setPestCountForm] = useState({ Moscas: 0, Mosquitos: 0, Mariposas: 0, Outros: [] });

    // Lists State
    const [serviceTypeList, setServiceTypeList] = useState(['Inspeção', 'Monitoramento', 'Pulverização', 'Atomização', 'Termonebulização', 'Polvilhamento', 'Iscagem com Gel', 'Implantação']);
    const [targetPestList, setTargetPestList] = useState(['Roedores', 'Moscas', 'Mosquitos', 'Baratas', 'Formigas', 'Aranhas', 'Traças']);
    const [locationList, setLocationList] = useState(['Área Interna', 'Área Externa']);
    const [productsList, setProductsList] = useState([]);

    useEffect(() => {
        fetchProducts(); // Fetch registered products
        fetchCompanySettings(); // Fetch company settings for PDF

        // Priority 1: Navigation state (New OS)
        if (location.state && location.state.clientName) {
            startExecutionFromState(location.state);
        }
        // Priority 2: Resume active OS from localStorage
        else {
            const savedOS = localStorage.getItem('active_os_context');
            if (savedOS) {
                const parsedOS = JSON.parse(savedOS);
                setActiveOS(parsedOS.activeOS);
                setOsData(prev => ({ ...prev, ...parsedOS.osData, checkIn: new Date(parsedOS.osData.checkIn) })); // Restore dates
                setOsData(prev => ({ ...prev, ...parsedOS.osData, checkIn: new Date(parsedOS.osData.checkIn) })); // Restore dates
                setSavedServices(parsedOS.savedServices || []);
                setSignatureData(parsedOS.signatureData || null);
                setView('execution');
                setCurrentScreen('home'); // Always start at dashboard on resume
            } else {
                fetchServiceOrders();
            }
        }
    }, [location.state]);

    const fetchCompanySettings = async () => {
        // Try cache first
        const cached = localStorage.getItem('cached_company_settings');
        if (cached) {
            setCompanySettings(JSON.parse(cached));
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('company_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (data) {
                    setCompanySettings(data);
                    localStorage.setItem('cached_company_settings', JSON.stringify(data));
                }
            }
        } catch (err) {
            console.error("Error loading company settings", err);
        }
    };

    // Save state whenever relevant data changes
    useEffect(() => {
        if (view === 'execution' && activeOS) {
            localStorage.setItem('active_os_context', JSON.stringify({
                activeOS,
                osData,
                savedServices,
                signatureData
            }));
        }
    }, [view, activeOS, osData, savedServices, signatureData]);

    const startExecutionFromState = async (state) => {
        let clientDetails = {
            id: state.eventId || 'temp-id',
            clientName: state.clientName,
            address: 'Endereço não encontrado',
            contactName: '',
            phone: '',
            email: '',
            doc: '' // CNPJ/CPF
        };

        // Try to fetch full client info from Supabase
        if (state.clientName) {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                let query = supabase
                    .from('clients')
                    .select('*')
                    .eq('name', state.clientName);

                // If user is logged in, filter by user_id to avoid cross-user conflicts or stale public data
                if (user) {
                    query = query.eq('user_id', user.id);
                }

                const { data, error } = await query.maybeSingle();

                if (data) {
                    // Construct full address
                    const fullAddress = [
                        data.street,
                        data.number,
                        data.neighborhood,
                        data.city,
                        data.state
                    ].filter(Boolean).join(', ');

                    clientDetails = {
                        ...clientDetails,
                        clientCode: data.code, // Store Client Code explicitly
                        // Keep ID as the OS ID (eventId), do not overwrite with client code
                        address: fullAddress || clientDetails.address,
                        contactName: data.contact_name || data.name,
                        phone: data.phone || '',
                        email: data.email || '',
                        doc: data.document || '',
                        city: data.city || 'Marau',
                        fantasyName: data.fantasy_name || ''
                    };
                }
            } catch (err) {
                console.error("Error fetching client details:", err);
            }
        }

        setActiveOS(clientDetails);

        // Auto Check-in
        const initialOsData = { ...osData, checkIn: new Date() };
        setOsData(initialOsData);

        setView('execution');
        setCurrentScreen('home');
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
                    id: existingIndex >= 0 ? newDevices[existingIndex].id : Date.now() + Math.random(), // Keep ID if exists
                    pestCounts: existingIndex >= 0 ? (newDevices[existingIndex].pestCounts || []) : [], // Preserve or init counts
                    pestCountDone: existingIndex >= 0 ? (newDevices[existingIndex].pestCountDone || false) : false
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

    const handleSelectRemaining = () => {
        if (!currentDevice.type) return alert('Selecione um tipo de dispositivo primeiro.');
        if (!osData.totalDevices) return alert('Defina a quantidade total de dispositivos.');

        const recordedNumbers = osData.devices.map(d => d.number);
        const total = osData.totalDevices || 0;
        const remaining = [];

        for (let i = 1; i <= total; i++) {
            if (!recordedNumbers.includes(i.toString())) {
                remaining.push(i.toString());
            }
        }

        if (remaining.length === 0) return alert('Todos os dispositivos já foram registrados.');

        setCurrentDevice(prev => ({
            ...prev,
            status: 'Conforme',
            selectedNumbers: remaining
        }));
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

        const alwaysUsesProducts = ['Pulverização', 'Atomização', 'Termonebulização', 'Polvilhamento', 'Iscagem com Gel'].includes(osData.serviceType);
        const neverUsesProducts = ['Inspeção'].includes(osData.serviceType);

        if (alwaysUsesProducts && osData.products.length === 0) {
            return alert(`O serviço de ${osData.serviceType} requer o uso de produtos. Adicione ao menos um produto.`);
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
                        status: 'Conforme',
                        pestCounts: [],
                        pestCountDone: true // Conforme doesn't need count
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

        // Check for pending counts immediately after saving
        const hasPending = newService.devices.some(d =>
            d.type === 'Armadilha Luminosa' &&
            ['Refil Substituído', 'Praga Encontrada'].includes(d.status) &&
            !d.pestCountDone
        );

        if (hasPending) {
            if (window.confirm('Existem dispositivos que requerem contagem de pragas. Deseja realizar a contagem agora?')) {
                setShowPestCountModal(true);
            }
        }

        setCurrentScreen('home'); // Return to hub
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

    const handleConfirmFinish = async () => {
        try {
            // This is the actual finish logic
            if (!signatureData) {
                return alert('É necessário coletar a assinatura do cliente antes de finalizar.');
            }

            // Validate Mandatory Company Logo
            if (!companySettings?.logo_url) {
                return alert('Configuração Obrigatória: O logotipo da empresa não foi encontrado. Por favor, adicione-o em "Ajustes > Dados da Empresa" antes de finalizar.');
            }

            let finalServices = [...savedServices];

            if (finalServices.length === 0) {
                return alert('Nenhum serviço registrado para finalizar.');
            }

            // Generate PDF
            await generatePDF(finalServices, activeOS, osData.checkIn, osData.checkOut || new Date(), signatureData);

            console.log('Finalizing OS:', { activeOS, checkIn: osData.checkIn, checkOut: new Date(), services: finalServices });

            // Clear saved context
            localStorage.removeItem('active_os_context');

            alert(`OS Finalizada com sucesso! O relatório PDF foi gerado.`);
            navigate('/'); // Go back to calendar
        } catch (error) {
            console.error("Critical Error Finishing OS:", error);
            alert("Ocorreu um erro ao finalizar a OS: " + error.message);
        }
    }

    const handleFinishOS = () => {
        // Validation before going to summary

        // Check for unsaved form data
        if (osData.serviceType && osData.targetPest) {
            if (!window.confirm('Você tem dados no formulário que não foram salvos. Eles serão descartados ao finalizar. Deseja continuar?')) {
                return;
            }
        }

        let finalServices = [...savedServices];
        if (finalServices.length === 0) {
            return alert('Nenhum serviço registrado. Preencha os dados e clique em Salvar Serviço.');
        }

        if (!osData.checkOut) {
            handleCheckOut(); // Auto checkout if forgot
        }

        // Validate Pending Counts
        const pendingCounts = finalServices.flatMap(s => s.devices).filter(d =>
            d.type === 'Armadilha Luminosa' &&
            ['Refil Substituído', 'Praga Encontrada'].includes(d.status) &&
            !d.pestCountDone
        );

        if (pendingCounts.length > 0) {
            setShowPestCountModal(true);
            return alert(`Existem ${pendingCounts.length} dispositivos aguardando contagem de pragas. Realize a contagem antes de finalizar.`);
        }

        // Go to Summary
        setCurrentScreen('summary');
    };

    const generatePDF = async (services, clientInfo, checkIn, checkOut, clientSignature) => {
        try {
            const doc = new jsPDF();

            const safeClientName = clientInfo?.clientName || 'Cliente';
            const safeAddress = clientInfo?.address || '';
            const safeId = clientInfo?.id || 'N/A';

            // --- Header Colors & Fonts ---
            const primaryColor = [22, 101, 192];
            const headerTextColor = [255, 255, 255];
            doc.setFont('helvetica', 'normal');

            // --- Logo & Title ---
            // If we have a logo URL in companySettings, use it.
            // We'll need to fetch the image data first to ensure it renders in the PDF.
            let logoDataUrl = null;
            if (companySettings?.logo_url) {
                try {
                    // Check if it is already a data URL or a remote URL
                    if (companySettings.logo_url.startsWith('data:')) {
                        logoDataUrl = companySettings.logo_url;
                    } else {
                        // Fetch remote image
                        const response = await fetch(companySettings.logo_url);
                        const blob = await response.blob();
                        logoDataUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (e) {
                    console.warn("Failed to load logo image", e);
                }
            }

            if (logoDataUrl) {
                // Determine dimensions to maintain aspect ratio
                // Create a temporary image to get natural dimensions
                const imgProps = await new Promise((resolve) => {
                    const img = new Image();
                    img.src = logoDataUrl;
                    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                    img.onerror = () => resolve(null); // Fallback
                });

                let pdfLogoWidth = 50;
                let pdfLogoHeight = 20;

                if (imgProps) {
                    const MAX_WIDTH = 70;
                    const MAX_HEIGHT = 25;
                    const ratio = Math.min(MAX_WIDTH / imgProps.width, MAX_HEIGHT / imgProps.height);
                    pdfLogoWidth = imgProps.width * ratio;
                    pdfLogoHeight = imgProps.height * ratio;
                }

                // Add Logo with calculated dimensions
                doc.addImage(logoDataUrl, 'PNG', 14, 10, pdfLogoWidth, pdfLogoHeight, undefined, 'FAST');
            }
            // Removed fallback text as logo is mandatory

            doc.setFontSize(16);
            doc.text("Ordem De Serviço", 105, 22, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Nº O.S.: ${safeId}`, 195, 15, { align: 'right' });

            // --- Company & Date Info ---
            const startY = 35;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            doc.text("SAFEPRAG - CONTROLE DE PRAGAS", 14, startY);
            doc.text("CNPJ: 83.992.155/0001-89", 14, startY + 5);
            doc.text("Endereço: Rua Paraná, 78, Centro, Marau/RS", 14, startY + 10);
            doc.text("Telefone: 54991413601", 14, startY + 15);
            doc.text("Email: contato@safeprag.com", 14, startY + 20);
            doc.text("Licença Ambiental: 01012/2025 - Validade: 10/03/2030", 14, startY + 25);

            doc.text(`Data: ${format(new Date(checkIn), 'dd/MM/yyyy')}`, 195, startY + 5, { align: 'right' });
            doc.text(`Hora Início: ${format(new Date(checkIn), 'HH:mm')}`, 195, startY + 10, { align: 'right' });
            doc.text(`Hora Fim: ${format(new Date(checkOut), 'HH:mm')}`, 195, startY + 15, { align: 'right' });
            doc.text("Alvará Sanitário: 649/2025 - Validade: 22/10/2026", 195, startY + 25, { align: 'right' });

            let currentY = startY + 35;

            const addSectionHeader = (title, y) => {
                doc.setFillColor(...primaryColor);
                doc.rect(14, y, 182, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...headerTextColor);
                doc.text(title, 16, y + 5);
                doc.setTextColor(0, 0, 0);
                return y + 12;
            };

            // --- Dados Do Cliente ---
            currentY = addSectionHeader("Dados Do Cliente", currentY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            doc.text(`Código Do Cliente: ${clientInfo?.clientCode || 'N/A'}`, 14, currentY);
            doc.text(`Razão Social: ${safeClientName}`, 14, currentY + 5);
            doc.text(`Nome: ${clientInfo?.contactName || safeClientName}`, 14, currentY + 10);
            doc.text(`CNPJ/CPF: ${clientInfo?.doc || 'N/A'}`, 14, currentY + 15);
            doc.text(`Cidade: ${clientInfo?.city || 'Marau'}`, 14, currentY + 20);

            doc.text(`Endereço: ${safeAddress}`, 110, currentY);
            doc.text(`Telefone: ${clientInfo?.phone || 'N/A'}`, 110, currentY + 5);
            doc.text(`Contato: ${clientInfo?.contactName || 'N/A'}`, 110, currentY + 10);
            doc.text(`Email: ${clientInfo?.email || 'N/A'}`, 110, currentY + 15);

            currentY += 30;

            // --- Informações Dos Serviços ---
            currentY = addSectionHeader("Informações Dos Serviços", currentY);

            const serviceTableData = services.map(s => [
                s.serviceType,
                s.targetPest,
                s.location
            ]);

            autoTable(doc, {
                startY: currentY - 5,
                head: [['Serviço', 'Praga Alvo', 'Local']],
                body: serviceTableData,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255, halign: 'center', fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 9, halign: 'center' },
                margin: { left: 14, right: 14 }
            });
            currentY = doc.lastAutoTable.finalY + 10;

            // --- Produtos Utilizados ---
            const allProducts = services.flatMap(s => s.products.map(p => ({ ...p, location: s.location })));

            if (allProducts.length > 0) {
                const productTableData = allProducts.map(p => [
                    p.name,
                    p.active_ingredient || 'Cipermetrina 25%',
                    p.chemical_group || 'Piretroide',
                    p.registration || '3.1606.00 46.001-7',
                    p.batch || '006223418',
                    p.validity ? format(new Date(p.validity), 'dd/MM/yyyy') : '01/11/2026',
                    `${p.quantity} ${p.unit}`,
                    p.diluent || 'Água',
                    p.antidote || '-'
                ]);

                doc.setFillColor(...primaryColor);
                doc.rect(14, currentY, 182, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.text("Produtos Utilizados", 16, currentY + 5);
                currentY += 7;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Produto', 'Princípio Ativo', 'Grupo Químico', 'Registro', 'Lote', 'Validade', 'Quantidade', 'Diluente', 'Antídoto']],
                    body: productTableData,
                    theme: 'grid',
                    headStyles: { fillColor: primaryColor, textColor: 255, halign: 'center', fontSize: 8, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2 },
                    margin: { left: 14, right: 14 }
                });
                currentY = doc.lastAutoTable.finalY + 10;
            } else {
                currentY = addSectionHeader("Produtos Utilizados", currentY);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text("Nenhum produto utilizado.", 14, currentY + 5);
                currentY += 15;
            }

            // --- Observações ---
            const allObs = [
                ...(osData.observations ? [osData.observations] : []),
                ...services.map(s => s.observations).filter(Boolean)
            ].join('. ');

            if (allObs && allObs.trim().length > 0) {
                // Check if observations fit in the remaining page space
                if (currentY + 30 > 280) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFillColor(...primaryColor);
                doc.rect(14, currentY, 182, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text("Observações", 16, currentY + 5);

                doc.setDrawColor(200);

                // Better text wrapping handling
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);

                const splitObs = doc.splitTextToSize(allObs, 178);
                // 10pt font is ~3.5mm. With spacing it's approx 4mm.
                const lineHeight = 4;
                const boxHeight = (splitObs.length * lineHeight) + 2; // Very tight fit: text + 2mm total padding

                doc.rect(14, currentY + 7, 182, boxHeight);
                // Start text at Y+7 (box top) + 3.5 (approx baseline for first line). 
                // Using 10.5 gives ~3.5mm top padding for baseline.
                doc.text(splitObs, 16, currentY + 10.5);

                currentY += (7 + boxHeight + 5); // Header (7) + Box + Spacing (5)
            } else {
                currentY += 5; // Minimal spacing if skipped
            }

            // --- Signatures ---
            // We need space for: Spacing (10) + Image (20) + Line/Text (20) = ~50 units
            if (currentY + 50 > 280) {
                doc.addPage();
                currentY = 20;
            }

            // Ensure color is black for signatures (fixes invisible text if Obs block is skipped)
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(0); // Reset draw color to black for signature lines
            doc.setFontSize(10); // Ensure consistent font size

            // Pre-load signatures
            let techSigDataUrl = null;
            let pestSigDataUrl = null;

            // Helper to load image
            const loadImage = async (url) => {
                if (!url) return null;
                try {
                    if (url.startsWith('data:')) return url;
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn("Failed to load signature", e);
                    return null;
                }
            };

            if (companySettings?.technical_responsible_signature_url) {
                techSigDataUrl = await loadImage(companySettings.technical_responsible_signature_url);
            }
            if (companySettings?.pest_controller_signature_url) {
                pestSigDataUrl = await loadImage(companySettings.pest_controller_signature_url);
            }

            // Move the signature line down significantly to accommodate the image above it
            const sigY = currentY + 35;
            const col1X = 40;
            const col2X = 105;
            const col3X = 170;

            // Signature 1: Pest Controller
            if (pestSigDataUrl) {
                doc.addImage(pestSigDataUrl, 'PNG', col1X - 20, sigY - 20, 40, 20);
            }
            doc.line(col1X - 25, sigY, col1X + 25, sigY);
            doc.setFont('helvetica', 'bold');
            doc.text("Controlador De Pragas", col1X, sigY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(companySettings?.pest_controller_name || "Jair Marinho", col1X, sigY + 10, { align: 'center' });
            doc.text(companySettings?.pest_controller_phone || "54991413601", col1X, sigY + 15, { align: 'center' });

            // Signature 2: Technical Responsible
            if (techSigDataUrl) {
                doc.addImage(techSigDataUrl, 'PNG', col2X - 20, sigY - 20, 40, 20);
            }
            doc.line(col2X - 25, sigY, col2X + 25, sigY);
            doc.setFont('helvetica', 'bold');
            doc.text("Responsável Técnico", col2X, sigY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(companySettings?.technical_responsible_name || "Luiz G. S. Adreatta", col2X, sigY + 10, { align: 'center' });
            doc.text(companySettings?.technical_responsible_crea || "CREA SC 1232188", col2X, sigY + 15, { align: 'center' });

            // Signature 3: Client
            if (clientSignature) {
                // Changed from sigY - 25 to sigY - 20 to strictly match the other signatures' vertical alignment
                doc.addImage(clientSignature, 'PNG', col3X - 20, sigY - 20, 40, 20);
            }
            doc.line(col3X - 25, sigY, col3X + 25, sigY);
            doc.setFont('helvetica', 'bold');
            doc.text("Contato Do Cliente", col3X, sigY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(safeClientName, col3X, sigY + 10, { align: 'center' });
            doc.text(clientInfo?.phone || "", col3X, sigY + 15, { align: 'center' });

            doc.save(`OS_${safeId}_${safeClientName.replace(/\s+/g, '_')}.pdf`);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("Erro ao gerar PDF: " + err.message);
        }
    };

    const saveSignature = () => {
        if (!tempSignature) {
            alert("Por favor, assine antes de confirmar.");
            return;
        }
        setSignatureData(tempSignature);
        setShowSignatureModal(false);
    };

    const handleOpenSignatureModal = () => {
        setTempSignature(null);
        setShowSignatureModal(true);
    };

    // Pest Count Logic
    const getPendingCountDevices = () => {
        const list = [];
        savedServices.forEach(service => {
            service.devices.forEach(device => {
                if (device.type === 'Armadilha Luminosa' &&
                    ['Refil Substituído', 'Praga Encontrada'].includes(device.status) &&
                    !device.pestCountDone) {
                    list.push({ ...device, serviceId: service.id, serviceType: service.serviceType });
                }
            });
        });
        return list;
    };

    const handleOpenPestCount = (device, serviceId) => {
        setCurrentCountingDevice({ ...device, serviceId });
        // Init form with existing counts if any (rare case for pending)
        const initialCounts = { Moscas: 0, Mosquitos: 0, Mariposas: 0, Outros: [] };
        if (device.pestCounts) {
            device.pestCounts.forEach(p => {
                if (initialCounts[p.name] !== undefined) initialCounts[p.name] = p.quantity;
                else initialCounts.Outros.push(p);
            });
        }
        setPestCountForm(initialCounts);
    };

    const handleSavePestCount = () => {
        if (!currentCountingDevice) return;

        const counts = [
            { name: 'Moscas', quantity: pestCountForm.Moscas },
            { name: 'Mosquitos', quantity: pestCountForm.Mosquitos },
            { name: 'Mariposas', quantity: pestCountForm.Mariposas },
            ...pestCountForm.Outros
        ].filter(c => c.quantity > 0);

        setSavedServices(prev => prev.map(s => {
            if (s.id === currentCountingDevice.serviceId) {
                return {
                    ...s,
                    devices: s.devices.map(d => {
                        if (d.number === currentCountingDevice.number && d.type === currentCountingDevice.type) { // Assumes unique number per type/service or use ID
                            return { ...d, pestCounts: counts, pestCountDone: true };
                        }
                        return d;
                    })
                };
            }
            return s;
        }));

        setCurrentCountingDevice(null);

        // If no more pending, close modal? No, keep open to finish list
        // Actually, if we are in the "modal list view", we just stay there.
        // We only close the DETAIL view (currentCountingDevice = null).
    };

    const updatePestCount = (pest, delta) => {
        setPestCountForm(prev => ({
            ...prev,
            [pest]: Math.max(0, (prev[pest] || 0) + delta)
        }));
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

                {/* Header Actions for Sub-screens */}
                {currentScreen !== 'home' && (
                    <div style={{ padding: '10px 15px', background: '#f5f5f5', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i
                            className='bx bx-chevron-left'
                            style={{ fontSize: '2rem', color: 'var(--text-primary)', cursor: 'pointer' }}
                            onClick={() => setCurrentScreen('home')}
                        ></i>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {currentScreen === 'devices' && 'Gerenciar Dispositivos'}
                            {currentScreen === 'products' && 'Gerenciar Produtos'}
                            {currentScreen === 'evidence' && 'Não Conformidades'}
                            {currentScreen === 'pests' && 'Contagem de Pragas'}
                            {currentScreen === 'summary' && 'Resumo do Atendimento'}
                        </h3>
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>

                    {/* Pest Count Alert/Button */}
                    {getPendingCountDevices().length > 0 && (
                        <div style={{ marginBottom: '15px', padding: '10px', background: '#fff4e5', borderLeft: '4px solid #ff9800', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className='bx bx-error' style={{ color: '#ef6c00', fontSize: '1.2rem' }}></i>
                                <span style={{ color: '#e65100', fontWeight: 'bold' }}>
                                    {getPendingCountDevices().length} contagens pendentes
                                </span>
                            </div>
                            <button
                                onClick={() => setShowPestCountModal(true)}
                                style={{
                                    padding: '6px 12px',
                                    background: '#ef6c00',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Realizar Contagem
                            </button>
                        </div>
                    )}

                    {/* Hub / Home Screen */}
                    {currentScreen === 'home' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Setup Cards - Service Info */}
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className='bx bx-info-circle' style={{ color: 'var(--accent-color)' }}></i> Informações do Serviço
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Tipo de Serviço</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <select
                                                value={osData.serviceType || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Auto-clear products if changing to Inspeção
                                                    if (val === 'Inspeção' && osData.products.length > 0) {
                                                        if (window.confirm('Mudar para Inspeção irá remover os produtos adicionados. Continuar?')) {
                                                            setOsData(prev => ({ ...prev, serviceType: val, products: [] }));
                                                        }
                                                    } else {
                                                        setOsData(prev => ({ ...prev, serviceType: val }));
                                                    }
                                                }}
                                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">Selecione...</option>
                                                {serviceTypeList.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <button onClick={() => handleAddItem(setServiceTypeList, serviceTypeList)} style={{ width: '45px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Praga Alvo</label>
                                            <select
                                                value={osData.targetPest || ''}
                                                onChange={(e) => setOsData(prev => ({ ...prev, targetPest: e.target.value }))}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">Selecione...</option>
                                                {targetPestList.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Local / Setor</label>
                                            <select
                                                value={osData.location || ''}
                                                onChange={(e) => setOsData(prev => ({ ...prev, location: e.target.value }))}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">Selecione...</option>
                                                {locationList.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Action Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                                {/* Devices Button */}
                                <div
                                    onClick={() => setCurrentScreen('devices')}
                                    style={{
                                        background: 'var(--bg-element)', padding: '20px', borderRadius: '12px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '50%', color: '#2196F3' }}>
                                        <i className='bx bx-target-lock' style={{ fontSize: '1.8rem' }}></i>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Dispositivos</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {osData.devices.length} adicionados
                                        </div>
                                    </div>
                                </div>

                                {/* Products Button - Conditional */}
                                {(!osData.serviceType || osData.serviceType !== 'Inspeção') && (
                                    <div
                                        onClick={() => setCurrentScreen('products')}
                                        style={{
                                            background: 'var(--bg-element)', padding: '20px', borderRadius: '12px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer',
                                            border: (['Pulverização', 'Atomização', 'Termonebulização', 'Polvilhamento', 'Iscagem com Gel'].includes(osData.serviceType) && osData.products.length === 0)
                                                ? '1px solid #ff9800' : '1px solid transparent'
                                        }}
                                    >
                                        <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '50%', color: '#4CAF50' }}>
                                            <i className='bx bx-spray-can' style={{ fontSize: '1.8rem' }}></i>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Produtos</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {osData.products.length} utilizados
                                            </div>
                                            {/* Optional Badge for Required */}
                                            {['Pulverização', 'Atomização', 'Termonebulização', 'Polvilhamento', 'Iscagem com Gel'].includes(osData.serviceType) && (
                                                <div style={{ fontSize: '0.7rem', color: '#ff9800', fontWeight: 'bold', marginTop: '4px' }}>Obrigatório</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Evidence Button */}
                                <div
                                    onClick={() => setCurrentScreen('evidence')}
                                    style={{
                                        background: 'var(--bg-element)', padding: '20px', borderRadius: '12px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '50%', color: '#ff9800' }}>
                                        <i className='bx bx-camera' style={{ fontSize: '1.8rem' }}></i>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Não Conformidades</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {osData.evidences.length > 0 || osData.observations ? 'Registrado' : 'Vazio'}
                                        </div>
                                    </div>
                                </div>

                                {/* Pests Button */}
                                <div
                                    onClick={() => setCurrentScreen('pests')}
                                    style={{
                                        background: 'var(--bg-element)', padding: '20px', borderRadius: '12px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ background: '#f3e5f5', padding: '12px', borderRadius: '50%', color: '#9c27b0' }}>
                                        <i className='bx bx-bug' style={{ fontSize: '1.8rem' }}></i>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Contagem</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Verificar contagens
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Observations Field - Moved Here */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px' }}>Observações</label>
                                <textarea
                                    value={osData.observations || ''}
                                    onChange={(e) => setOsData(prev => ({ ...prev, observations: e.target.value }))}
                                    placeholder="Observações gerais sobre o serviço..."
                                    rows="3"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', background: 'var(--bg-color)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* Saved Services List (Mini View) */}
                            {savedServices.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Serviços Realizados ({savedServices.length})</h3>
                                    {savedServices.map((service) => (
                                        <div key={service.id} style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid var(--accent-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{service.serviceType}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <i
                                                        className='bx bx-pencil'
                                                        style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.3rem' }}
                                                        onClick={() => handleEditService(service)}
                                                    ></i>
                                                    <i
                                                        className='bx bx-trash'
                                                        style={{ cursor: 'pointer', color: '#ff4d4d', fontSize: '1.3rem' }}
                                                        onClick={() => handleDeleteService(service.id)}
                                                    ></i>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {service.targetPest} - {service.location}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    )}


                    {/* Tab: Devices */}
                    {currentScreen === 'devices' && (
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
                                        <option value="" disabled>Selecione um tipo de dispositivo</option>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className='bx bx-bug'></i> Dispositivos Disponíveis
                                            </h4>

                                            <button
                                                onClick={handleSelectRemaining}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '0.8rem',
                                                    background: '#e6f7ff',
                                                    color: 'var(--accent-color)',
                                                    border: '1px solid var(--accent-color)',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                Selecionar Restantes (Conforme)
                                            </button>
                                        </div>
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
                    {currentScreen === 'products' && (
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
                    {currentScreen === 'evidence' && (
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

                    {/* Tab: Pest Counts Table */}
                    {currentScreen === 'pests' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'var(--bg-element)', padding: '15px', borderRadius: '10px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Tabela de Contagem</h4>

                                {(() => {
                                    // Aggregate all devices with counts
                                    const allCountedDevices = [];
                                    savedServices.forEach(s => {
                                        if (s.devices) {
                                            s.devices.forEach(d => {
                                                if (d.pestCounts && d.pestCounts.length > 0) {
                                                    allCountedDevices.push({ ...d, location: s.location });
                                                }
                                            });
                                        }
                                    });

                                    if (allCountedDevices.length === 0) {
                                        return <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhuma contagem registrada.</p>;
                                    }

                                    return (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                                                        <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>Disp.</th>
                                                        <th style={{ padding: '10px', textAlign: 'center', color: '#666' }}>Moscas</th>
                                                        <th style={{ padding: '10px', textAlign: 'center', color: '#666' }}>Mosquitos</th>
                                                        <th style={{ padding: '10px', textAlign: 'center', color: '#666' }}>Mariposas</th>
                                                        <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>Outros</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {allCountedDevices.map((d, i) => {
                                                        const getCount = (name) => d.pestCounts.find(p => p.name === name)?.quantity || 0;
                                                        const outros = d.pestCounts.filter(p => !['Moscas', 'Mosquitos', 'Mariposas'].includes(p.name)).map(p => `${p.name} (${p.quantity})`).join(', ');

                                                        return (
                                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                                <td style={{ padding: '10px' }}>
                                                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{d.number}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.location}</div>
                                                                </td>
                                                                <td style={{ padding: '10px', textAlign: 'center', color: getCount('Moscas') > 0 ? 'var(--accent-color)' : '#ccc' }}>
                                                                    {getCount('Moscas')}
                                                                </td>
                                                                <td style={{ padding: '10px', textAlign: 'center', color: getCount('Mosquitos') > 0 ? 'var(--accent-color)' : '#ccc' }}>
                                                                    {getCount('Mosquitos')}
                                                                </td>
                                                                <td style={{ padding: '10px', textAlign: 'center', color: getCount('Mariposas') > 0 ? 'var(--accent-color)' : '#ccc' }}>
                                                                    {getCount('Mariposas')}
                                                                </td>
                                                                <td style={{ padding: '10px', color: '#666' }}>{outros || '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                    {/* Summary Screen */}
                    {currentScreen === 'summary' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'var(--bg-element)', padding: '20px', borderRadius: '12px' }}>
                                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                    <i className='bx bx-file'></i> Resumo Final
                                </h2>

                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                    <p><strong>Cliente:</strong> {activeOS.clientName}</p>
                                    <p><strong>Início:</strong> {format(osData.checkIn, 'dd/MM/yyyy HH:mm')}</p>
                                    <p><strong>Término:</strong> {format(osData.checkOut || new Date(), 'dd/MM/yyyy HH:mm')}</p>
                                </div>

                                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Serviços Realizados</h3>
                                {savedServices.map((service, index) => (
                                    <div key={index} style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
                                        <div style={{ fontWeight: 'bold' }}>{service.serviceType}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#666' }}>{service.targetPest} - {service.location}</div>

                                        {/* Products Summary */}
                                        {service.products.length > 0 && (
                                            <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                                                <strong>Produtos:</strong> {service.products.map(p => `${p.name} (${p.quantity}${p.unit})`).join(', ')}
                                            </div>
                                        )}

                                        {/* Devices Summary */}
                                        {service.devices.length > 0 && (
                                            <div style={{ marginTop: '5px', fontSize: '0.85rem' }}>
                                                <strong>Dispositivos:</strong> {service.devices.length} verificados
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Total Counts */}
                                {(() => {
                                    const allPests = savedServices.flatMap(s => s.devices || []).flatMap(d => d.pestCounts || []);
                                    if (allPests.length > 0) {
                                        return (
                                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '5px' }}>Total de Pragas</h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                                    {['Moscas', 'Mosquitos', 'Mariposas'].map(name => {
                                                        const total = allPests.filter(p => p.name === name).reduce((sum, p) => sum + p.quantity, 0);
                                                        return (
                                                            <div key={name} style={{ textAlign: 'center', background: '#fff', padding: '5px', borderRadius: '4px', border: '1px solid #eee' }}>
                                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{name}</div>
                                                                <div style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{total}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    }
                                })()}

                                {/* Signature Preview */}
                                {signatureData ? (
                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '1rem', color: '#666' }}>Assinatura Coletada</h3>
                                        <img src={signatureData} alt="Assinatura" style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc', borderRadius: '4px' }} />
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#fff3e0', color: '#e65100', borderRadius: '8px', textAlign: 'center' }}>
                                        <i className='bx bx-error'></i> Assinatura pendente
                                    </div>
                                )}
                            </div>

                            {/* Summary Actions */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {!signatureData && (
                                    <button
                                        onClick={handleOpenSignatureModal}
                                        style={{ flex: 1, padding: '15px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem' }}
                                    >
                                        Coletar Assinatura
                                    </button>
                                )}

                                {signatureData && (
                                    <button
                                        onClick={handleConfirmFinish}
                                        style={{ flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    >
                                        Confirmar e Finalizar
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Persistent Footer Actions */}
                {/* Persistent Footer Actions - Only on Home */}
                {currentScreen === 'home' && (
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
                                onClick={handleOpenSignatureModal}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: signatureData ? '#8e44ad' : '#f39c12',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <i className='bx bx-pencil'></i> {signatureData ? 'Assinado' : 'Aprovar'}
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
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    opacity: !signatureData ? 0.6 : 1,
                                    pointerEvents: !signatureData ? 'none' : 'auto'
                                }}
                            >
                                <i className='bx bx-check-circle'></i> Finalizar
                            </button>
                        </div>
                    </div>
                )}

                {/* Signature Modal */}
                {
                    showSignatureModal && (
                        <div className="modal-overlay" style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '10px',
                                width: '90%',
                                maxWidth: '400px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '15px'
                            }}>
                                <h3 style={{ margin: 0, color: '#333', textAlign: 'center' }}>Assinatura do Cliente</h3>

                                <div style={{ background: '#f9f9f9' }}>
                                    <SignaturePad onChange={setTempSignature} />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={saveSignature} style={{ flex: 1, padding: '10px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Confirmar</button>
                                </div>
                                <button onClick={() => setShowSignatureModal(false)} style={{ marginTop: '5px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar</button>
                            </div>
                        </div>
                    )
                }

                {/* Pest Count Modal */}
                {
                    showPestCountModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                        }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '10px',
                                width: '90%',
                                maxWidth: '500px',
                                maxHeight: '80vh',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}>
                                {/* Header */}
                                <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Contagem de Pragas</h3>
                                    <i className='bx bx-x' style={{ fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowPestCountModal(false)}></i>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '15px', overflowY: 'auto' }}>
                                    {!currentCountingDevice ? (
                                        // List View
                                        <>
                                            <p style={{ color: '#666', marginBottom: '15px' }}>
                                                É obrigatório realizar a contagem de todos os dispositivos listados.
                                                <span style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: '5px' }}>
                                                    Pendentes: {getPendingCountDevices().length}
                                                </span>
                                            </p>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                {getPendingCountDevices().map((d, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleOpenPestCount(d, d.serviceId)}
                                                        style={{
                                                            padding: '10px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '8px',
                                                            background: '#fff',
                                                            cursor: 'pointer',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Armadilha luminosa {d.number}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{d.serviceType}</div>
                                                    </button>
                                                ))}
                                                {getPendingCountDevices().length === 0 && (
                                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#2ecc71', padding: '20px' }}>
                                                        <i className='bx bx-check-circle' style={{ fontSize: '2rem' }}></i>
                                                        <p>Todas as contagens realizadas!</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        // Detail View
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                <i className='bx bx-arrow-back' style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setCurrentCountingDevice(null)}></i>
                                                <h4 style={{ margin: 0 }}>Armadilha luminosa {currentCountingDevice.number}</h4>
                                            </div>

                                            {['Moscas', 'Mosquitos', 'Mariposas'].map(pest => (
                                                <div key={pest} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#333' }}>{pest}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <button
                                                            onClick={() => updatePestCount(pest, -1)}
                                                            style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#ddd', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >−</button>
                                                        <input
                                                            type="number"
                                                            value={pestCountForm[pest]}
                                                            onChange={(e) => setPestCountForm(prev => ({ ...prev, [pest]: parseInt(e.target.value) || 0 }))}
                                                            style={{ width: '50px', padding: '5px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }}
                                                        />
                                                        <button
                                                            onClick={() => updatePestCount(pest, 1)}
                                                            style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#ddd', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                onClick={handleSavePestCount}
                                                style={{
                                                    marginTop: '10px',
                                                    padding: '12px',
                                                    background: '#2ecc71',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                <i className='bx bx-save'></i> Salvar Contagem
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '15px', borderTop: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowPestCountModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#666' }}>
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
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
