import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Configuration CORS pour la production - Origines autorisées
  const allowedOrigins = [
    'https://inotech-gabon.com',
    'https://livreur.inotech-gabon.com',
    'https://sous-caisse.inotech-gabon.com',
    'https://client.inotech-gabon.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://pwa-delivery.vercel.app', // Si déployé sur Vercel
  ];

  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (allowedOrigins.includes(origin || '') ? (origin || 'https://inotech-gabon.com') : 'https://inotech-gabon.com')
    : '*';

  // Gérer les requêtes preflight CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
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
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
