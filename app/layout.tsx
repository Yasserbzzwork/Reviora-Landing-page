import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Reviora | Shampooing anti-chute · العناية بالشعر',description:'Découvrez le shampooing anti-chute Reviora, 150 ml. Votre rituel de soin capillaire, livré au Maroc avec paiement à la livraison.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
