import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 若要部署到 GitHub Pages，base 要設成 "/你的repo名稱/"
export default defineConfig({
  plugins: [react()],
  base: "/volleyball-score-tracker/",
});
