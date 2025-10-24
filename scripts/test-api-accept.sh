#!/bin/bash

# Récupérer l'ID de la commande en attente
ORDER_ID="cmguc6iy60001sbquvkcbf6cq"
DRIVER_ID="cmgtqa3fs0003qk0ke47lp00a"  # Jean Dupoont
ZONE_ID="cmgtq6e3r0001qk0k6gzuq2ay"    # Owendo

echo "🧪 Test de l'API d'acceptation de commande"
echo ""
echo "📦 Commande ID: $ORDER_ID"
echo "🚚 Livreur ID: $DRIVER_ID"
echo "📍 Zone ID: $ZONE_ID"
echo ""

# Appel à l'API
curl -X POST http://https://crm.sambatechpro.com':3000/api/delivery/orders/$ORDER_ID/accept \
  -H "Content-Type: application/json" \
  -d "{\"driverId\":\"$DRIVER_ID\",\"zoneId\":\"$ZONE_ID\"}" \
  | jq '.'

echo ""
echo "✅ Test terminé"
