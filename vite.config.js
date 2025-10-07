import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base:"/Flip_Book_Customize/",
  plugins: [react()],
  optimizeDeps: {
    include: ['react-pageflip']
  }
})
