/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs SONAM Assurance
        sonam: {
          primary: '#600046',      // Violet principal sidebar
          accent: '#7FC41C',       // Vert accent (nouveau topic, badges actifs)
          active: '#4B0037',       // Violet sélectionné/actif
          profile: '#701A59',      // Fond zone profil
        },
        bg: {
          knowledge: '#FFF9FE',    // Fond base connaissances
          light: '#FAFAFA',        // Arrière-plan général
        },
        border: {
          light: '#D3D3D3',       // Bordures claires
          chat: '#D7D7D7',        // Bordure chat
          subtle: '#E5E5E5',      // Bordures très légères
        },
        text: {
          primary: '#1F2937',     // Texte principal
          secondary: '#6B7280',   // Texte secondaire
          light: '#9CA3AF',       // Texte léger
          white: '#FFFFFF',       // Texte blanc
        }
      },
      borderRadius: {
        'sonam-xs': '4px',         // Petits éléments
        'sonam-sm': '6px',         // Cards fichiers
        'sonam-md': '10px',        // Boutons, topics actifs, historique
        'sonam-lg': '20px',        // Zones principales, profil, chat
        'sonam-xl': '24px',        // Grandes zones
      },
      boxShadow: {
        'chat': '0 11px 17px 1px rgba(0, 0, 0, 0.10)',          // Chat shadow Figma
        'sidebar': '4px 0 12px rgba(0, 0, 0, 0.05)',            // Sidebar shadow
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',                // Cards légères
        'dropdown': '0 8px 24px rgba(0, 0, 0, 0.12)',           // Dropdown profil
        'history': '0 0 20px rgba(0, 0, 0, 0.08)',              // Sidebar historique
      },
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '88': '22rem',    // 352px - largeur sidebar
        '96': '24rem',    // 384px - largeur history sidebar
        '72': '18rem',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-up': 'scaleUp 0.15s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}