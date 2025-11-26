const { exec } = require('child_process');

console.log('🔧 Test de compilation du backend...');

exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erreur de compilation:');
    console.error(error.message);
    console.error('\n📋 Détails:');
    console.error(stderr);
    process.exit(1);
  }
  
  if (stderr && stderr.includes('Failed to compile')) {
    console.error('❌ Compilation échouée:');
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('✅ Compilation réussie !');
  console.log('\n📊 Résultat:');
  console.log(stdout);
});
