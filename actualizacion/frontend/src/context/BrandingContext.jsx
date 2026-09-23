import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [company, setCompany] = useState({
    name: 'HomeCare del Quindío I.P.S.',
    slogan: 'Bienestar en casa.',
    logo_url: '/homecare-logo.png',
    primary_color: '#e1136c',
    secondary_color: '#00b0b9',
    accent_color: '#7cb518'
  });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const applyThemeColors = (comp) => {
    if (!comp) return;
    const root = document.documentElement;
    if (comp.primary_color) root.style.setProperty('--brand-primary', comp.primary_color);
    if (comp.secondary_color) root.style.setProperty('--brand-secondary', comp.secondary_color);
    if (comp.accent_color) root.style.setProperty('--brand-accent', comp.accent_color);
    if (comp.name) document.title = `${comp.name} - Sistema de Turnos Inteligente`;
  };

  const fetchBranding = async () => {
    try {
      const res = await api.getPublicSettings();
      if (res.success) {
        if (res.company) {
          setCompany(res.company);
          applyThemeColors(res.company);
        }
        if (res.settings) setSettings(res.settings);
      }
    } catch (e) {
      console.warn('Error cargando branding:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyThemeColors(company);
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ company, settings, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      company: {
        name: 'HomeCare del Quindío I.P.S.',
        slogan: 'Bienestar en casa.',
        logo_url: '/homecare-logo.png',
        primary_color: '#e1136c',
        secondary_color: '#00b0b9',
        accent_color: '#7cb518'
      },
      settings: {},
      loading: false,
      refreshBranding: () => {}
    };
  }
  return context;
}
