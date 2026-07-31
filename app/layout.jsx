import './site.css';

export const metadata = {
  title: 'PMS业财一体化原型',
  description: 'PMS业财一体化系统高保真原型',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
