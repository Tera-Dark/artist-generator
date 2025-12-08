/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 黑白黄极简高级感配色
        primary: {
          50: '#fffef0',
          100: '#fffbd6',
          200: '#fff5ad',
          300: '#ffeb7a',
          400: '#ffde47',
          500: '#ffd000', // 核心黄色：高饱和、工业感
          600: '#d1a900',
          700: '#a38300',
          800: '#755d00',
          900: '#473800',
        },
        // 极致中性灰
        neutral: {
          50: '#fafafa', // 极浅灰背景
          100: '#f5f5f5', // 浅灰背景
          200: '#e5e5e5', // 线条/边框
          300: '#d4d4d4', // 深边框
          400: '#a3a3a3', // 图标/弱文本
          500: '#737373', // 次要文本
          600: '#525252', // 正文
          700: '#404040', // 重要文本
          800: '#262626', // 深色背景/标题
          900: '#171717', // 黑色背景
          950: '#0a0a0a', // 极致深黑
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
      borderRadius: {
        'none': '0',
        'sm': '0',
        DEFAULT: '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        // 'full': '9999px', // 保留 full 以备圆形需求，但组件中尽量少用
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
    require('@tailwindcss/typography'),
  ],
}
