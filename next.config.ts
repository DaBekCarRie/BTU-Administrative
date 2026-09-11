import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // มี package-lock.json ค้างอยู่ที่ home ทำให้ turbopack เดา root ผิด
  turbopack: { root: __dirname },
  // Playwright เรียกผ่าน 127.0.0.1
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
