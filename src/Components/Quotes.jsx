import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import './CalendarApp.css';

const Quotes = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [companySettings, setCompanySettings] = useState(null);

    const [clientData, setClientData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        cnpj: '',
        city: 'Marau',
        number: '',
        neighborhood: ''
    });

    const [items, setItems] = useState([
        { description: '', quantity: 1, price: 0 }
    ]);

    const [observation, setObservation] = useState('');

    useEffect(() => {
        fetchCompanySettings();
        // Load persist data
        const savedData = localStorage.getItem('quotes_draft_data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.clientData) setClientData(parsed.clientData);
            if (parsed.items) setItems(parsed.items);
            if (parsed.observation) setObservation(parsed.observation);
        }
    }, []);

    // Persist data whenever it changes
    useEffect(() => {
        const dataToSave = {
            clientData,
            items,
            observation
        };
        localStorage.setItem('quotes_draft_data', JSON.stringify(dataToSave));
    }, [clientData, items, observation]);

    const fetchCompanySettings = async () => {
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

    const handleClientChange = (e) => {
        let { name, value } = e.target;

        if (name === 'cnpj') {
            // Remove non-digits and limit to 14
            value = value.replace(/\D/g, '').substring(0, 14);
            // Apply Mask (CPF or CNPJ logic combined or specific)
            // Standard generic behavior: try to format as typed
            if (value.length > 11) {
                // CNPJ: 00.000.000/0000-00
                value = value
                    .replace(/^(\d{2})(\d)/, '$1.$2')
                    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1/$2')
                    .replace(/(\d{4})(\d)/, '$1-$2');
            } else {
                // CPF: 000.000.000-00
                value = value
                    .replace(/^(\d{3})(\d)/, '$1.$2')
                    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                    .replace(/\.(\d{3})(\d)/, '.$1-$2');
            }
        } else if (name === 'phone') {
            // Remove non-digits and limit to 11
            value = value.replace(/\D/g, '').substring(0, 11);
            // Apply Phone mask: (00) 00000-0000 or (00) 0000-0000
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 5) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
        }

        setClientData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, price: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    };

    const generatePDF = async () => {
        if (!clientData.name) {
            return alert('Por favor, preencha o nome do cliente.');
        }

        setLoading(true);
        try {
            const doc = new jsPDF({ compress: true });

            // --- Company Settings / Header ---
            const primaryColor = [22, 101, 192];

            // Helper to load image
            const compressImage = (url, maxWidth = 500, format = 'image/png', quality = 0.8) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = url;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (format === 'image/jpeg') {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, width, height);
                        }
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL(format, quality));
                    };
                    img.onerror = () => resolve(null);
                });
            };

            const loadImage = async (url, maxWidth = 300) => {
                if (!url) return null;
                try {
                    if (url.startsWith('data:')) {
                        return compressImage(url, maxWidth);
                    }
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    return new Promise((resolve) => {
                        reader.onloadend = () => {
                            resolve(compressImage(reader.result, maxWidth));
                        };
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn("Failed to load image", e);
                    return null;
                }
            };

            // Load Logo
            let logoDataUrl = null;
            if (companySettings?.logo_url) {
                logoDataUrl = await loadImage(companySettings.logo_url, 500);
            }

            if (logoDataUrl) {
                const imgProps = await new Promise((resolve) => {
                    const img = new Image();
                    img.src = logoDataUrl;
                    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                    img.onerror = () => resolve(null);
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
                doc.addImage(logoDataUrl, 'PNG', 14, 10, pdfLogoWidth, pdfLogoHeight, undefined, 'FAST');
            }

            doc.setFontSize(16);
            doc.text("ORÇAMENTO", 105, 22, { align: 'center' });

            const currentDate = new Date();
            doc.setFontSize(10);
            doc.text(`Data: ${format(currentDate, 'dd/MM/yyyy')}`, 195, 15, { align: 'right' });
            doc.text(`Validade: 30 dias`, 195, 20, { align: 'right' });

            // --- Company Info ---
            const startY = 35;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            const compName = companySettings?.name || "";
            const compCnpj = companySettings?.cnpj || "";
            const compStreet = companySettings?.street || "";
            const compNum = companySettings?.number || "";
            const compCity = companySettings?.city || "";
            const compPhone = companySettings?.phone || "";
            const compEmail = companySettings?.email || "";

            doc.text(compName, 14, startY);
            doc.text(`CNPJ: ${compCnpj}`, 14, startY + 5);
            doc.text(`Endereço: ${compStreet}, ${compNum}, ${compCity}`, 14, startY + 10);
            doc.text(`Telefone: ${compPhone}`, 14, startY + 15);
            doc.text(`Email: ${compEmail}`, 14, startY + 20);

            let currentY = startY + 30;

            const addSectionHeader = (title, y) => {
                doc.setFillColor(...primaryColor);
                doc.rect(14, y, 182, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.text(title, 16, y + 5);
                doc.setTextColor(0, 0, 0);
                return y + 12;
            };

            // --- Client Info ---
            currentY = addSectionHeader("Dados do Cliente", currentY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            doc.text(`Cliente: ${clientData.name}`, 14, currentY);
            doc.text(`Endereço: ${clientData.address}, ${clientData.number} - ${clientData.neighborhood}`, 14, currentY + 5);
            doc.text(`Cidade: ${clientData.city}`, 14, currentY + 10);
            doc.text(`CNPJ/CPF: ${clientData.cnpj}`, 110, currentY);
            doc.text(`Telefone: ${clientData.phone}`, 110, currentY + 5);
            doc.text(`Email: ${clientData.email}`, 110, currentY + 10);

            currentY += 25;

            // --- Items Table ---
            const tableBody = items.map(item => [
                item.description,
                item.quantity,
                `R$ ${parseFloat(item.price).toFixed(2)}`,
                `R$ ${(item.quantity * item.price).toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Descrição', 'Qtd', 'V. Unit.', 'Total']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255, halign: 'center' },
                bodyStyles: { halign: 'center' },
                columnStyles: { 0: { halign: 'left' } }, // Description aligns left
                foot: [['', '', 'TOTAL', `R$ ${calculateTotal().toFixed(2)}`]],
                footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'right' }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            // --- Observation ---
            // --- Observation ---
            if (observation) {
                // currentY = addSectionHeader("Observações", currentY); // Removed manual header to use table header

                autoTable(doc, {
                    startY: currentY,
                    head: [['Observações']],
                    body: [[observation]],
                    theme: 'grid',
                    headStyles: { fillColor: primaryColor, textColor: 255, halign: 'left' },
                    bodyStyles: { halign: 'left', cellPadding: 3 },
                    columnStyles: { 0: { cellWidth: 'auto' } }
                });

                currentY = doc.lastAutoTable.finalY + 10;
            }

            // --- Signatures (Optional for Quote, usually just issuer signature) ---
            if (currentY + 40 > 280) {
                doc.addPage();
                currentY = 20;
            }

            const sigY = currentY + 30;

            // Render Pest Controller Signature
            let pestSigDataUrl = null;
            if (companySettings?.pest_controller_signature_url) {
                pestSigDataUrl = await loadImage(companySettings.pest_controller_signature_url, 300);
            }

            if (pestSigDataUrl) {
                doc.addImage(pestSigDataUrl, 'PNG', 105 - 20, sigY - 20, 40, 20);
            }

            doc.setDrawColor(0);
            doc.line(70, sigY, 140, sigY);
            doc.setFontSize(8);
            doc.text("Controlador de Pragas", 105, sigY + 5, { align: 'center' });
            if (companySettings?.pest_controller_name) {
                doc.text(companySettings.pest_controller_name, 105, sigY + 10, { align: 'center' });
            }

            doc.save(`Orcamento_${clientData.name.replace(/\s+/g, '_')}_${format(currentDate, 'dd-MM-yyyy')}.pdf`);

        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Erro ao gerar PDF.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'block', paddingBottom: '100px' }}>
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto' }}>

                {/* Header */}
                <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button
                        onClick={() => navigate('/settings')}
                        className="header-btn"
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '2rem' }}
                    >
                        <i className='bx bx-chevron-left'></i>
                    </button>
                    <span className="month-picker">Novo Orçamento</span>
                    <div style={{ width: '40px' }}></div>
                </div>

                <div style={{ padding: '0 1rem' }}>
                    {/* Client Section */}
                    <h3 style={{ borderBottom: '1px solid var(--text-muted)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Cliente</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>Nome / Razão Social</label>
                            <input
                                type="text" name="name" value={clientData.name} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>CNPJ / CPF</label>
                            <input
                                type="text" name="cnpj" value={clientData.cnpj} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>Endereço</label>
                            <input
                                type="text" name="address" value={clientData.address} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>Número</label>
                            <input
                                type="text" name="number" value={clientData.number} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)' }}>Bairro</label>
                        <input
                            type="text" name="neighborhood" value={clientData.neighborhood} onChange={handleClientChange}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>Cidade</label>
                            <input
                                type="text" name="city" value={clientData.city} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)' }}>Telefone</label>
                            <input
                                type="text" name="phone" value={clientData.phone} onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)' }}>Email</label>
                        <input
                            type="email" name="email" value={clientData.email} onChange={handleClientChange}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Items Section */}
                    <h3 style={{ borderBottom: '1px solid var(--text-muted)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1rem', color: 'var(--text-primary)' }}>Itens do Orçamento</h3>

                    {items.map((item, index) => (
                        <div key={index} style={{ marginBottom: '1rem', background: 'var(--bg-element)', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Descrição</label>
                                <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #444', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Qtd</label>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #444', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Valor Unit. (R$)</label>
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #444', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                                    <span style={{ padding: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                        R$ {(item.quantity * item.price).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => removeItem(index)}
                                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <i className='bx bx-trash'></i> Remover Item
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addItem}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'transparent', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)', cursor: 'pointer', marginBottom: '2rem' }}
                    >
                        <i className='bx bx-plus'></i> Adicionar Item
                    </button>

                    <div style={{ textAlign: 'right', marginBottom: '2rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        <strong>Total: R$ {calculateTotal().toFixed(2)}</strong>
                    </div>

                    {/* Observations */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Observações</label>
                        <textarea
                            rows="4"
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--bg-element)', background: 'var(--bg-element)', color: 'var(--text-primary)' }}
                        ></textarea>
                    </div>

                    <button
                        onClick={generatePDF}
                        disabled={loading}
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Gerando...' : 'Gerar PDF Orçamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Quotes;
