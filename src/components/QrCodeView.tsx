import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 140,
  className = '',
  alt = 'Kisan Queue QR Token'
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#064e3b', // Deep agricultural emerald
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('QR generation error:', err);
        if (isMounted) {
          setError('QR Unavailable');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded-lg border border-slate-200 ${className}`}
        style={{ width: size, height: size }}
      >
        <span>{error}</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg border border-slate-200 bg-white p-1 shadow-2xs ${className}`}
    />
  );
};
