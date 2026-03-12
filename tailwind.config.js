/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 现代轻盈的品牌主色 (Sky Blue / Indigo feel)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // 核心蓝色：精致、现代、不刺眼
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // 柔和高级灰 (Slate/Zinc blend)
        neutral: {
          50: '#f8fafc', // 极浅灰背景
          100: '#f1f5f9', // 浅灰背景
          200: '#e2e8f0', // 线条/边框
          300: '#cbd5e1', // 深边框
          400: '#94a3b8', // 图标/弱文本
          500: '#64748b', // 次要文本
          600: '#475569', // 正文
          700: '#334155', // 重要文本
          800: '#1e293b', // 深色背景/标题
          900: '#0f172a', // 暗色系主背景
          950: '#020617', // 极致深黑（用于卡片或深度对比）
        },
        // 功能色彩
        success: {
          50: '#f0f9f0',
          500: '#4caf50',
        },
        warning: {
          50: '#fff8e1',
          500: '#ff9800',
        },
        error: {
          50: '#ffebee',
          500: '#f44336',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
        'soft-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.3)',
        'soft-dark-lg': '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
    require('@tailwindcss/typography'),
  ],
}
