import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // const cloudinaryEnv = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    server: {
      allowedHosts: true
    },
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify(env.VITE_CLOUDINARY_CLOUD_NAME || 'dhp9fpgol'),
      'import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(env.VITE_CLOUDINARY_UPLOAD_PRESET || 'deliveryya'),
      'import.meta.env.VITE_CLOUDINARY_FOLDER': JSON.stringify(env.VITE_CLOUDINARY_FOLDER || 'deliveryya/profiles'),
    }
  }
})