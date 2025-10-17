/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 黑白金配色系统
        primary: {
          50: '#fffef7',
          100: '#fffaeb',
          200: '#fff2cc',
          300: '#ffe699',
          400: '#ffd640', // 温暖活力的金色
          500: '#ffc700', // 主要金色
          600: '#e6b300',
          700: '#cc9900',
          800: '#b38600',
          900: '#997300',
        },
        // 柔和灰度系统
        neutral: {
          50: '#f9f8f5', // 米白背景
          100: '#ffffff', // 纯白容器
          200: '#f5f5f5', // 浅灰分割
          300: '#e0e0e0', // 边框灰
          400: '#cccccc', // 辅助灰
          500: '#bdbdbd', // 次要文本
          600: '#757575', // 描述文本
          700: '#424242', // 常规文本
          800: '#2d2d2d', // 主要文本
          900: '#1a1a1a', // 深色文本
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
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
    require('@tailwindcss/typography'),
  ],
}
