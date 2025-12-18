#!/usr/bin/env node

/**
 * Script de diagnostic Bamboo Pay
 * Vérifie la configuration et affiche les informations de debug
 */

console.log('🔍 Diagnostic Bamboo Pay\n')
console.log('='.repeat(50))

// 1. Vérifier les variables d'environnement
console.log('\n1️⃣  Variables d\'environnement')
console.log('-'.repeat(50))

const requiredEnvVars = [
    'BAMBOO_USERNAME',
    'BAMBOO_PASSWORD',
    'BAMBOO_MERCHANT_ID',
    'BAMBOO_BASE_URL',
    'BAMBOO_CALLBACK_URL'
]

let allConfigured = true

requiredEnvVars.forEach(varName => {
    const value = process.env[varName]
    const isSet = !!value
    const icon = isSet ? '✅' : '❌'
    const display = isSet ? `${value.substring(0, 10)}...` : 'NON DÉFINIE'

    console.log(`${icon} ${varName}: ${display}`)

    if (!isSet && varName !== 'BAMBOO_CALLBACK_URL') {
        allConfigured = false
    }
})

console.log('\n' + '='.repeat(50))

if (!allConfigured) {
    console.log('\n⚠️  ATTENTION: Certaines variables requises ne sont pas définies!')
    console.log('\nPour configurer Bamboo Pay, ajoutez ces lignes à votre fichier .env:')
    console.log('\nBAMBOO_USERNAME=votre_identifiant')
    console.log('BAMBOO_PASSWORD=votre_mot_de_passe')
    console.log('BAMBOO_MERCHANT_ID=votre_merchant_id')
    console.log('BAMBOO_BASE_URL=https://client.bamboopay-ga.com/api')
    console.log('BAMBOO_CALLBACK_URL=https://votre-domaine.com/api/webhooks/bamboo-pay')
    console.log('\nPuis redémarrez le serveur avec: npm run dev')
    process.exit(1)
}

// 2. Tester le service
console.log('\n2️⃣  Test du service BambooPayService')
console.log('-'.repeat(50))

try {
    // Import dynamique pour éviter les erreurs si le module n'existe pas
    const { bambooPayService } = require('./lib/bamboo-pay')

    console.log('✅ Module bamboo-pay chargé')

    const isConfigured = bambooPayService.isConfigured()
    console.log(`${isConfigured ? '✅' : '❌'} Service configuré: ${isConfigured}`)

    // Test formatage numéro
    console.log('\n3️⃣  Test formatage numéros')
    console.log('-'.repeat(50))

    const testNumbers = [
        '+241077000000',
        '241077000000',
        '077000000',
        '77000000',
        '077 00 00 00',
        '077-00-00-00'
    ]

    testNumbers.forEach(num => {
        const formatted = bambooPayService.formatPhoneNumber(num)
        console.log(`📱 ${num.padEnd(20)} → ${formatted}`)
    })

    // Test génération référence
    console.log('\n4️⃣  Test génération de référence')
    console.log('-'.repeat(50))

    const ref1 = bambooPayService.generateReference('TEST')
    const ref2 = bambooPayService.generateReference('TEST')

    console.log(`📝 Référence 1: ${ref1}`)
    console.log(`📝 Référence 2: ${ref2}`)
    console.log(`${ref1 !== ref2 ? '✅' : '❌'} Références uniques: ${ref1 !== ref2}`)

    console.log('\n' + '='.repeat(50))
    console.log('\n✅ Diagnostic terminé avec succès!')
    console.log('\n💡 Prochaines étapes:')
    console.log('   1. Testez un paiement dans l\'interface POS')
    console.log('   2. Vérifiez les logs dans la console du navigateur')
    console.log('   3. Vérifiez les logs du serveur')

} catch (error) {
    console.error('\n❌ Erreur lors du chargement du service:', error.message)
    console.log('\n💡 Assurez-vous que:')
    console.log('   1. Le fichier lib/bamboo-pay.ts existe')
    console.log('   2. Le serveur est démarré (npm run dev)')
    console.log('   3. Les dépendances sont installées (npm install)')
    process.exit(1)
}
