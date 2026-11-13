import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Reviora | Shampooing',description:'Découvrez Reviora, votre shampooing pour la routine capillaire. Livraison au Maroc et paiement à la livraison.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
