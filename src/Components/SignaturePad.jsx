import React, { useRef, useEffect, useState } from 'react';

const SignaturePad = ({ onChange, initialUrl, disabled = false }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    // Keep track if the canvas is empty or has content (drawn or loaded)
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set high resolution for retina displays
        const ratio = Math.ceil(window.devicePixelRatio || 1);

        // We need to set the internal dimensions (width/height attributes) 
        // to match the CSS dimensions * ratio for sharpness.
        // We'll do this once on mount or via a ResizeObserver if we wanted to be perfect.
        // For simplicity, let's assume a fixed aspect ratio or simple responsive width.
        // Let's use the offsetWidth/Height from the parent container or fixed values.

        // However, standard technique:
        const setCanvasSize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            const ctx = canvas.getContext('2d');
            ctx.scale(ratio, ratio);

            // If we had an image loaded, we might need to redraw it here.
            // For now, if we resize, we might lose data if we don't save it. 
            // In a simple generic implementation, we just accept clearing on massive resize or handle it better.
            // Let's just set it once.
        };

        setCanvasSize();
        // optionally window.addEventListener('resize', setCanvasSize);

    }, []);

    // Load initial URL if provided (read-only preview mostly, or editable if we implement image loading)
    // For signatures, usually loading an image onto the canvas to EDIT is tricky (tainted canvas).
    // Better to show the image in an <img> tag if it exists, and use canvas only for NEW signatures.
    // So we will handle that in the parent component. (Show img if exists + 'Clear/New' button).
    // This component will strictly be for CAPTURING new signatures.

    const startDrawing = (e) => {
        if (disabled) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
        setIsEmpty(false);
    };

    const draw = (e) => {
        if (!isDrawing || disabled) return;
        e.preventDefault(); // Prevent scrolling on mobile

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round'; // Smoother turns
        ctx.strokeStyle = '#0051d4'; // Blue pen color

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            // Notify parent
            if (onChange) {
                const canvas = canvasRef.current;
                // Convert to data URL
                const dataUrl = canvas.toDataURL('image/png');
                onChange(dataUrl);
            }
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        if (onChange) onChange(null);
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                overflow: 'hidden',
                height: '200px',
                backgroundColor: '#fff',
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'crosshair'
            }}>
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {isEmpty && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#ccc',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}>
                        Assine aqui
                    </div>
                )}
            </div>
            {!disabled && (
                <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                        alignSelf: 'flex-end',
                        background: 'transparent',
                        border: '1px solid #ff4d4d',
                        color: '#ff4d4d',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    Limpar Assinatura
                </button>
            )}
        </div>
    );
};

export default SignaturePad;
