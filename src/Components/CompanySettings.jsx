import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignaturePad from './SignaturePad';
import './CalendarApp.css'; // Reusing general styles

const CompanySettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        phone: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        environmentalLicenseNumber: '',
        environmentalLicenseValidity: '',
        sanitaryPermitNumber: '',
        sanitaryPermitValidity: '',
        email: '',
        technicalResponsibleName: '',
        technicalResponsibleCrea: '',
        technicalResponsiblePhone: '',
        technicalResponsibleEmail: '',
        technicalResponsibleSignature: null, // URL or Base64
        pestControllerName: '',
        pestControllerPhone: '',
        pestControllerEmail: '',
        pestControllerSignature: null
    });
    const [logoPreview, setLogoPreview] = useState(null);

    // Load initial data
    useEffect(() => {
        const fetchCompanySettings = async () => {
            setLoading(true);
            try {
                // Try initializing from cache first
                const cached = localStorage.getItem('cached_company_settings');
                if (cached) {
                    const data = JSON.parse(cached);
                    setFormData({
                        name: data.name || '',
                        cnpj: data.cnpj || '',
                        phone: data.phone || '',
                        street: data.street || '',
                        number: data.number || '',
                        neighborhood: data.neighborhood || '',
                        city: data.city || '',
                        environmentalLicenseNumber: data.environmental_license_number || data.environmentalLicenseNumber || '',
                        environmentalLicenseValidity: data.environmental_license_validity || data.environmentalLicenseValidity || '',
                        sanitaryPermitNumber: data.sanitary_permit_number || data.sanitaryPermitNumber || '',
                        sanitaryPermitValidity: data.sanitary_permit_validity || data.sanitaryPermitValidity || '',
                        email: data.email || '',
                        technicalResponsibleName: data.technical_responsible_name || data.technicalResponsibleName || '',
                        technicalResponsibleCrea: data.technical_responsible_crea || data.technicalResponsibleCrea || '',
                        technicalResponsiblePhone: data.technical_responsible_phone || data.technicalResponsiblePhone || '',
                        technicalResponsibleEmail: data.technical_responsible_email || data.technicalResponsibleEmail || '',
                        technicalResponsibleSignature: data.technical_responsible_signature_url || data.technicalResponsibleSignature || null,
                        pestControllerName: data.pest_controller_name || data.pestControllerName || '',
                        pestControllerPhone: data.pest_controller_phone || data.pestControllerPhone || '',
                        pestControllerEmail: data.pest_controller_email || data.pestControllerEmail || '',
                        pestControllerSignature: data.pest_controller_signature_url || data.pestControllerSignature || null
                    });
                    if (data.logo_url) {
                        setLogoPreview(data.logo_url);
                    }
                }

                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { data, error } = await supabase
                        .from('company_settings')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    if (error) {
                        if (error.code !== 'PGRST116') {
                            console.error('Error fetching settings:', error);
                        }
                    } else if (data) {
                        setFormData({
                            name: data.name || '',
                            cnpj: data.cnpj || '',
                            phone: data.phone || '',
                            street: data.street || '',
                            number: data.number || '',
                            neighborhood: data.neighborhood || '',
                            city: data.city || '',
                            environmentalLicenseNumber: data.environmental_license_number || '',
                            environmentalLicenseValidity: data.environmental_license_validity || '',
                            sanitaryPermitNumber: data.sanitary_permit_number || '',
                            sanitaryPermitValidity: data.sanitary_permit_validity || '',
                            email: data.email || '',
                            technicalResponsibleName: data.technical_responsible_name || '',
                            technicalResponsibleCrea: data.technical_responsible_crea || '',
                            technicalResponsiblePhone: data.technical_responsible_phone || '',
                            technicalResponsibleEmail: data.technical_responsible_email || '',
                            technicalResponsibleSignature: data.technical_responsible_signature_url || null,
                            pestControllerName: data.pest_controller_name || '',
                            pestControllerPhone: data.pest_controller_phone || '',
                            pestControllerEmail: data.pest_controller_email || '',
                            pestControllerSignature: data.pest_controller_signature_url || null
                        });
                        if (data.logo_url) {
                            setLogoPreview(data.logo_url);
                        }
                        // Update cache
                        localStorage.setItem('cached_company_settings', JSON.stringify(data));
                    }
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanySettings();
    }, []);

    // Sync Queue Logic
    const processSettingsSync = async () => {
        if (!navigator.onLine) return;

        const queueStr = localStorage.getItem('settings_sync_queue');
        if (!queueStr) return;

        const queue = JSON.parse(queueStr);
        if (queue.length === 0) return;

        console.log("Processing settings sync queue:", queue);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Process the last item
            const lastItem = queue[queue.length - 1];

            if (lastItem) {
                // Map the queue item to DB columns, filtering out extra cache keys
                const dbPayload = {
                    user_id: user.id,
                    name: lastItem.name,
                    cnpj: lastItem.cnpj,
                    phone: lastItem.phone,
                    street: lastItem.street,
                    number: lastItem.number,
                    neighborhood: lastItem.neighborhood,
                    city: lastItem.city,
                    email: lastItem.email,
                    environmental_license_number: lastItem.environmental_license_number || lastItem.environmentalLicenseNumber,
                    environmental_license_validity: lastItem.environmental_license_validity || lastItem.environmentalLicenseValidity,
                    sanitary_permit_number: lastItem.sanitary_permit_number || lastItem.sanitaryPermitNumber,
                    sanitary_permit_validity: lastItem.sanitary_permit_validity || lastItem.sanitaryPermitValidity,
                    technical_responsible_name: lastItem.technical_responsible_name || lastItem.technicalResponsibleName,
                    technical_responsible_crea: lastItem.technical_responsible_crea || lastItem.technicalResponsibleCrea,
                    technical_responsible_phone: lastItem.technical_responsible_phone || lastItem.technicalResponsiblePhone,
                    technical_responsible_email: lastItem.technical_responsible_email || lastItem.technicalResponsibleEmail,
                    // If signature was a base64 string in queue, we can't easily upload it here without logic. 
                    // Ideally we skip it or only sync if it was a URL.
                    // For now, if it starts with http, use it. If data:, ignore or it'll fail/store huge string if text column allowed.
                    technical_responsible_signature_url: (lastItem.technical_responsible_signature_url && lastItem.technical_responsible_signature_url.startsWith('http')) ? lastItem.technical_responsible_signature_url : null,
                    pest_controller_name: lastItem.pest_controller_name || lastItem.pestControllerName,
                    pest_controller_phone: lastItem.pest_controller_phone || lastItem.pestControllerPhone,
                    pest_controller_email: lastItem.pest_controller_email || lastItem.pestControllerEmail,
                    pest_controller_signature_url: (lastItem.pest_controller_signature_url && lastItem.pest_controller_signature_url.startsWith('http')) ? lastItem.pest_controller_signature_url : null,
                    logo_url: (lastItem.logo_url && lastItem.logo_url.startsWith('http')) ? lastItem.logo_url : null
                };

                const { error } = await supabase
                    .from('company_settings')
                    .upsert(dbPayload, { onConflict: 'user_id' });

                if (error) throw error;
            }

            // Clear queue after success
            localStorage.removeItem('settings_sync_queue');

        } catch (err) {
            console.error("Sync error", err);
        }
    };

    useEffect(() => {
        window.addEventListener('online', processSettingsSync);
        // Try on mount
        processSettingsSync();
        return () => window.removeEventListener('online', processSettingsSync);
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

        if (name === 'cnpj') {
            // Remove non-digits and limit to 14
            value = value.replace(/\D/g, '').substring(0, 14);
            // Apply CNPJ mask: 00.000.000/0000-00
            value = value
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        } else if (name === 'phone' || name === 'technicalResponsiblePhone' || name === 'pestControllerPhone') {
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
        } else if (['environmentalLicenseValidity', 'sanitaryPermitValidity'].includes(name)) {
            value = formatDate(value);
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent opening the file dialog
        setLogoPreview(null);
        setLogoFile(null);
        const fileInput = document.getElementById('logo-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            let logoUrl = logoPreview;
            let signatureUrl = formData.technicalResponsibleSignature;
            let pestSignatureUrl = formData.pestControllerSignature;

            // Prepare data object for cache (optimistic)
            const settingsData = {
                name: formData.name,
                cnpj: formData.cnpj,
                phone: formData.phone,
                street: formData.street,
                number: formData.number,
                neighborhood: formData.neighborhood,
                city: formData.city,
                environmental_license_number: formData.environmentalLicenseNumber,
                environmental_license_validity: formData.environmentalLicenseValidity,
                sanitary_permit_number: formData.sanitaryPermitNumber,
                sanitary_permit_validity: formData.sanitaryPermitValidity,
                // store normalized keys for cache consistency
                environmentalLicenseNumber: formData.environmentalLicenseNumber,
                environmentalLicenseValidity: formData.environmentalLicenseValidity,
                sanitaryPermitNumber: formData.sanitaryPermitNumber,
                sanitaryPermitValidity: formData.sanitaryPermitValidity,
                email: formData.email,
                technical_responsible_name: formData.technicalResponsibleName,
                technical_responsible_crea: formData.technicalResponsibleCrea,
                technical_responsible_phone: formData.technicalResponsiblePhone,
                technical_responsible_email: formData.technicalResponsibleEmail,
                technical_responsible_signature_url: signatureUrl,
                // store keys
                technicalResponsibleName: formData.technicalResponsibleName,
                technicalResponsibleCrea: formData.technicalResponsibleCrea,
                technicalResponsiblePhone: formData.technicalResponsiblePhone,
                technicalResponsibleEmail: formData.technicalResponsibleEmail,
                technicalResponsibleSignature: signatureUrl, // This might be base64 initially in cache, fine

                pest_controller_name: formData.pestControllerName,
                pest_controller_phone: formData.pestControllerPhone,
                pest_controller_email: formData.pestControllerEmail,
                pest_controller_signature_url: pestSignatureUrl,
                // store keys
                pestControllerName: formData.pestControllerName,
                pestControllerPhone: formData.pestControllerPhone,
                pestControllerEmail: formData.pestControllerEmail,
                pestControllerSignature: pestSignatureUrl,

                logo_url: logoUrl
            };

            // 1. Save to Local Cache Immediately (Optimistic)
            localStorage.setItem('cached_company_settings', JSON.stringify(settingsData));

            if (!navigator.onLine) {
                // Offline Mode
                const queue = JSON.parse(localStorage.getItem('settings_sync_queue') || '[]');
                queue.push(settingsData);
                localStorage.setItem('settings_sync_queue', JSON.stringify(queue));

                alert("Sem conexão: Dados salvos localmente. Serão sincronizados quando houver internet.");
                setLoading(false);
                return;
            }

            if (!user) {
                alert("Usuário não autenticado.");
                return;
            }

            // Online Mode
            // Upload Logo if changed
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('company-logos')
                    .upload(filePath, logoFile);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('company-logos')
                    .getPublicUrl(filePath);

                logoUrl = publicUrl;
                settingsData.logo_url = logoUrl; // update url
            } else if (logoPreview === null) {
                // If logo was removed
                logoUrl = null;
                settingsData.logo_url = null;
            }

            // Upload Tech Signature
            if (signatureUrl && typeof signatureUrl === 'string' && signatureUrl.startsWith('data:')) {
                const blob = await (await fetch(signatureUrl)).blob();
                const fileExt = 'png';
                const fileName = `sig-${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `signatures/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('company-logos')
                    .upload(filePath, blob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('company-logos')
                    .getPublicUrl(filePath);

                signatureUrl = publicUrl;
                settingsData.technical_responsible_signature_url = signatureUrl;
            } else if (signatureUrl === null) {
                settingsData.technical_responsible_signature_url = null;
            }

            // Upload Pest Controller Signature
            if (pestSignatureUrl && typeof pestSignatureUrl === 'string' && pestSignatureUrl.startsWith('data:')) {
                const blob = await (await fetch(pestSignatureUrl)).blob();
                const fileExt = 'png';
                const fileName = `pest-sig-${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `signatures/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('company-logos')
                    .upload(filePath, blob);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('company-logos')
                    .getPublicUrl(filePath);

                pestSignatureUrl = publicUrl;
                settingsData.pest_controller_signature_url = pestSignatureUrl;
            } else if (pestSignatureUrl === null) {
                settingsData.pest_controller_signature_url = null;
            }


            // Update cache with new URLs
            localStorage.setItem('cached_company_settings', JSON.stringify(settingsData));

            // Upsert Data
            const { error } = await supabase
                .from('company_settings')
                .upsert({
                    user_id: user.id,
                    name: formData.name,
                    cnpj: formData.cnpj,
                    phone: formData.phone,
                    street: formData.street,
                    number: formData.number,
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    environmental_license_number: formData.environmentalLicenseNumber,
                    environmental_license_validity: formData.environmentalLicenseValidity,
                    sanitary_permit_number: formData.sanitaryPermitNumber,
                    sanitary_permit_validity: formData.sanitaryPermitValidity,
                    email: formData.email,
                    technical_responsible_name: formData.technicalResponsibleName,
                    technical_responsible_crea: formData.technicalResponsibleCrea,
                    technical_responsible_phone: formData.technicalResponsiblePhone,
                    technical_responsible_email: formData.technicalResponsibleEmail,
                    technical_responsible_signature_url: signatureUrl,
                    pest_controller_name: formData.pestControllerName,
                    pest_controller_phone: formData.pestControllerPhone,
                    pest_controller_email: formData.pestControllerEmail,
                    pest_controller_signature_url: pestSignatureUrl,
                    logo_url: logoUrl
                }, { onConflict: 'user_id' });

            if (error) throw error;

            alert("Dados da empresa salvos com sucesso!");

        } catch (error) {
            console.error('Error saving data:', error);
            // Fallback to queue 
            // We already constructed settingsData up top, but urls might be flawed if upload failed.
            // But we updated settingsData locally.
            const queue = JSON.parse(localStorage.getItem('settings_sync_queue') || '[]');
            // Try to salvage what we have (formData)
            // Note: Saving base64 to queue is heavy but necessary if offline/fail.
            queue.push({
                ...formData,
                logo_url: logoPreview,
                technical_responsible_signature_url: formData.technicalResponsibleSignature,
                pest_controller_signature_url: formData.pestControllerSignature
            });
            localStorage.setItem('settings_sync_queue', JSON.stringify(queue));

            alert("Erro ao salvar na nuvem. Dados salvos localmente para tentar novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calendar-app" style={{ overflowY: 'auto', height: '100vh', display: 'block' }}>
            <div className="calendar" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'auto', paddingBottom: '250px' }}>

                {/* Header with Back Button */}
                <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
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
                    <span className="month-picker">Dados da Empresa</span>
                    <div style={{ width: '40px' }}></div> {/* Spacer for alignment */}
                </div>

                <div style={{ padding: '0 1rem' }}>

                    {/* Logo Upload Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label htmlFor="logo-upload" style={{ cursor: 'pointer' }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    maxWidth: '300px', /* Allow wide logos */
                                    minHeight: '120px',
                                    borderRadius: '16px', /* Rounded rectangle instead of circle */
                                    background: '#2c2c2c',
                                    border: '2px dashed var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    padding: '10px'
                                }}>
                                    {logoPreview ? (
                                        <>
                                            <img
                                                src={logoPreview}
                                                alt="Logo Preview"
                                                crossOrigin="anonymous"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '150px' }}
                                            />
                                            <button
                                                onClick={handleRemoveLogo}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    background: 'rgba(0, 0, 0, 0.5)', /* Subtle dark background */
                                                    color: 'rgba(255, 255, 255, 0.8)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '28px', /* Slightly smaller */
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 10,
                                                    transition: 'all 0.2s',
                                                }}
                                                title="Remover logo"
                                            >
                                                <i className='bx bx-trash' style={{ fontSize: '1.2rem' }}></i>
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                                            <i className='bx bx-image-add' style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}></i>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Adicionar Logo</span>
                                        </div>
                                    )}

                                    <div style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        left: '0',
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.6)',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        textAlign: 'center',
                                        padding: '4px 0',
                                        backdropFilter: 'blur(2px)'
                                    }}>
                                        {logoPreview ? 'Alterar' : 'Upload'}
                                    </div>
                                </div>
                            </label>
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Nome da Empresa</label>
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
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>CNPJ</label>
                        <input
                            type="text"
                            name="cnpj"
                            value={formData.cnpj}
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
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Endereço</label>
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

                    <div style={{ marginBottom: '1.5rem' }}>
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

                    {/* Licença Ambiental */}
                    <div style={{ marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '500' }}>Licença Ambiental</h3>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Número da Licença</label>
                        <input
                            type="text"
                            name="environmentalLicenseNumber"
                            value={formData.environmentalLicenseNumber}
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
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Validade</label>
                        <input
                            type="text"
                            name="environmentalLicenseValidity"
                            value={formData.environmentalLicenseValidity}
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

                    {/* Alvará Sanitário */}
                    <div style={{ marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '500' }}>Alvará Sanitário</h3>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Número do Alvará</label>
                        <input
                            type="text"
                            name="sanitaryPermitNumber"
                            value={formData.sanitaryPermitNumber}
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

                    <div style={{ marginBottom: '2.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Validade</label>
                        <input
                            type="text"
                            name="sanitaryPermitValidity"
                            value={formData.sanitaryPermitValidity}
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

                    {/* Dados do Responsável Técnico */}
                    <div style={{ marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '500' }}>Dados do Responsável Técnico</h3>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Nome do Responsável Técnico</label>
                        <input
                            type="text"
                            name="technicalResponsibleName"
                            value={formData.technicalResponsibleName}
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
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>CREA</label>
                            <input
                                type="text"
                                name="technicalResponsibleCrea"
                                value={formData.technicalResponsibleCrea}
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
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Telefone</label>
                            <input
                                type="text"
                                name="technicalResponsiblePhone"
                                value={formData.technicalResponsiblePhone}
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

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>E-mail</label>
                        <input
                            type="email"
                            name="technicalResponsibleEmail"
                            value={formData.technicalResponsibleEmail}
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

                    <div style={{ marginBottom: '2.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Assinatura Digital (Canvas)</label>
                        {formData.technicalResponsibleSignature && !formData.technicalResponsibleSignature.startsWith('data:') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    background: '#fff',
                                    width: '100%',
                                    maxWidth: '400px',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <img
                                        src={formData.technicalResponsibleSignature}
                                        alt="Assinatura"
                                        crossOrigin="anonymous"
                                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                                    />
                                </div>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, technicalResponsibleSignature: null }))}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #ff4d4d',
                                        color: '#ff4d4d',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    Refazer Assinatura
                                </button>
                            </div>
                        ) : (
                            <SignaturePad
                                onChange={(val) => setFormData(prev => ({ ...prev, technicalResponsibleSignature: val }))}
                            />
                        )}
                    </div>

                    {/* Dados do Controlador de Pragas */}
                    <div style={{ marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-element)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '500' }}>Dados do Controlador de Pragas</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Nome do Controlador de Pragas</label>
                            <input
                                type="text"
                                name="pestControllerName"
                                value={formData.pestControllerName}
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
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Telefone</label>
                            <input
                                type="text"
                                name="pestControllerPhone"
                                value={formData.pestControllerPhone}
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

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>E-mail</label>
                        <input
                            type="email"
                            name="pestControllerEmail"
                            value={formData.pestControllerEmail}
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

                    <div style={{ marginBottom: '2.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Assinatura Digital (Controlador)</label>
                        {formData.pestControllerSignature && !formData.pestControllerSignature.startsWith('data:') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    background: '#fff',
                                    width: '100%',
                                    maxWidth: '400px',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <img
                                        src={formData.pestControllerSignature}
                                        alt="Assinatura Controlador"
                                        crossOrigin="anonymous"
                                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                                    />
                                </div>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, pestControllerSignature: null }))}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #ff4d4d',
                                        color: '#ff4d4d',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    Refazer Assinatura
                                </button>
                            </div>
                        ) : (
                            <SignaturePad
                                onChange={(val) => setFormData(prev => ({ ...prev, pestControllerSignature: val }))}
                            />
                        )}
                    </div>

                    <button
                        onClick={handleSave}
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
                        Salvar Alterações
                    </button>

                </div>
            </div>
        </div>
    );
};

export default CompanySettings;
