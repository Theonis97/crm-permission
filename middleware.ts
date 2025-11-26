import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Configuration CORS pour la production - Origines autorisées
  const allowedOrigins = [
    'http://192.168.1.115:3001',
    'https://livreur.inotech-gabon.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://pwa-delivery.vercel.app', // Si déployé sur Vercel
  ];

  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? (allowedOrigins.includes(origin || '') ? (origin || 'http://192.168.1.115:3001') : 'http://192.168.1.115:3001')
    : '*';

  // Gérer les requêtes preflight CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Ajouter les headers CORS à toutes les réponses API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'false');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
