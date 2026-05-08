/**
 * Usage (depuis la racine du projet) : npx tsx scripts/ebilling-auth-probe.ts
 * Envoie une facture test minimale ; affiche le statut HTTP et le début du corps (sans afficher les secrets).
 */
import { loadEnvConfig } from "@next/env"
import { resolve } from "path"

loadEnvConfig(resolve(process.cwd()))

function trimEnv(value: string | undefined): string {
  if (value == null) return ""
  let s = value.replace(/^\uFEFF/, "").trim()
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

async function tryVariant(label: string, user: string, key: string) {
  const base =
    trimEnv(process.env.EBILLING_API_BASE_URL)?.replace(/\/$/, "") ||
    "https://lab.billing-easy.net/api/v1/merchant"
  const u = user.normalize("NFC")
  const k = key.normalize("NFC")
  const auth = `Basic ${Buffer.from(`${u}:${k}`, "utf8").toString("base64")}`
  const url = `${base}/e_bills`
  const ref = `probe-${Date.now()}`
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: 100,
      short_description: "Auth probe",
      payer_email: "probe@example.com",
      payer_msisdn: "077000000",
      payer_name: "Probe",
      external_reference: ref,
      expiry_period: 60,
    }),
  })
  const text = await r.text()
  console.log(`\n--- ${label} ---\nHTTP ${r.status}\n${text.slice(0, 400)}`)
  return r.status
}

async function main() {
  const argvUser = process.argv[2]?.trim()
  const rawUser = trimEnv(process.env.EBILLING_USERNAME)
  const rawKey = trimEnv(process.env.EBILLING_SHARED_KEY)
  const email = trimEnv(process.env.EBILLING_DEFAULT_PAYER_EMAIL)

  if (!rawKey) {
    console.error("EBILLING_SHARED_KEY requis dans .env")
    process.exit(1)
  }
  if (!rawUser && !argvUser) {
    console.error("EBILLING_USERNAME dans .env, ou passer le username en argument : tsx scripts/ebilling-auth-probe.ts \"Théonis\"")
    process.exit(1)
  }

  const emailUser = rawUser.includes("@") ? rawUser.toLowerCase() : rawUser
  console.log("Sondage Basic Auth (plusieurs formes courantes)…")
  console.log(`usernameLen=${rawUser.length} keyLen=${rawKey.length} usernameHasAt=${rawUser.includes("@")}`)

  if (rawUser) {
    await tryVariant("A: EBILLING_USERNAME tel que dans .env (email lower si @)", emailUser, rawKey)
    await tryVariant("B: user:password inversés (SharedKey:Username)", rawKey, emailUser)
    await tryVariant("C: même que A avec NFC déjà appliqué côté user", emailUser.normalize("NFC"), rawKey)
  }

  if (email && email !== rawUser) {
    const eu = email.includes("@") ? email.toLowerCase() : email
    await tryVariant("D: EBILLING_DEFAULT_PAYER_EMAIL comme Basic user", eu, rawKey)
  }

  if (argvUser) {
    const vu = argvUser.includes("@") ? argvUser.toLowerCase() : argvUser
    await tryVariant(`E: username argument CLI « ${argvUser.slice(0, 20)}… » (${argvUser.length} chars)`, vu.normalize("NFC"), rawKey)
  }

  console.log(
    "\nSi tout est 401 : vérifier sur https://lab.billing-easy.net que le compte marchand est actif ; Username + SharedKey du même profil ; clé non régénérée ailleurs ; sinon demander à Digitech l’activation API LAB — contact@digitech-africa.com",
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
