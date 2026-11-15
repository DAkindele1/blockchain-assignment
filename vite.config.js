import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: "/src",
    },
  },
  server: {
    // During `npm run dev`, forward API calls to dev-server.js
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
})
