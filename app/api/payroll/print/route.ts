import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { calculateGrossSalary } from "@/lib/payroll-calculator"
import {
  type BulletinEmployerSettingsFields,
  type BulletinEmployerStoreFields,
  getBulletinEmployerDisplay,
  getPrimaryStoreForPayroll,
} from "@/lib/payroll-primary-store"
import { ContractType } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")

    if (!idsParam) {
      return NextResponse.json(
        { error: "Aucun bulletin sélectionné" },
        { status: 400 }
      )
    }

    const ids = idsParam.split(",")

    const payrolls = await prisma.payroll.findMany({
      where: {
        id: { in: ids },
        status: { in: ["VALIDATED", "APPROVED", "PARTIALLY_PAID", "PAID"] },
      },
      include: {
        employeeProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                matricule: true,
                storeUserRoles: {
                  orderBy: { assignedAt: "desc" },
                  include: {
                    store: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                        phone: true,
                        email: true,
                        rccm: true,
                        nif: true,
                        cnssEmployeur: true,
                        siegeSocial: true,
                        logo: true,
                        coverImage: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        period: true,
        contributionLines: {
          include: {
            contribution: true,
          },
        },
        rubricLines: {
          orderBy: [
            { rubricType: "asc" },
            { rubricName: "asc" },
          ],
        },
        adjustments: true,
        payments: {
          include: {
            paidBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { paymentDate: "asc" },
        },
      },
      orderBy: {
        number: "asc",
      },
    })

    if (payrolls.length === 0) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Erreur</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Aucun bulletin imprimable</h1>
          <p>Seuls les bulletins validés, approuvés, partiellement payés ou payés peuvent être imprimés.</p>
          <button onclick="window.close()">Fermer</button>
        </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      )
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + " FCFA"
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    }

    const statusLabels: Record<string, string> = {
      VALIDATED: "Validé",
      APPROVED: "Approuvé",
      PARTIALLY_PAID: "Partiellement payé",
      PAID: "Payé",
    }

    const contractTypeLabels: Record<string, string> = {
      CDI: "Contrat à Durée Indéterminée",
      CDD: "Contrat à Durée Déterminée",
      STAGE: "Stage",
      INTERIM: "Intérim",
      FREELANCE: "Freelance",
    }

    const companySettings = (await prisma.payrollCompanySettings.findFirst()) as
      | BulletinEmployerSettingsFields
      | null

    const formatContributionRatePercent = (appliedRate: unknown) => {
      const r = Number(appliedRate)
      if (!Number.isFinite(r)) return "—"
      if (r > 0 && r < 1) return `${(r * 100).toFixed(2)} %`
      return `${r.toFixed(2)} %`
    }

    const payslipsHtml = payrolls.map((payroll: any, index: number) => {
      const profile = payroll.employeeProfile
      const user = profile.user
      const period = payroll.period
      const expectedH =
        Number(payroll.expectedWorkingDays) * Number(profile.workingHoursPerDay) || 1
      const hourlyRate = profile.baseSalary / expectedH
      const otRate = Number(profile.overtimeRate) > 0 ? Number(profile.overtimeRate) : 1.5

      const employmentGross = Math.round(
        calculateGrossSalary(
          {
            contractType: profile.contractType as ContractType,
            baseSalary: profile.baseSalary,
            dailyRate: profile.dailyRate ?? null,
            hourlyRate: profile.hourlyRate ?? null,
            workingDaysPattern: profile.workingDaysPattern,
            workingHoursPerDay: profile.workingHoursPerDay,
          },
          payroll.daysWorked,
          payroll.hoursWorked,
          payroll.overtimeHours,
          otRate,
          payroll.expectedWorkingDays,
        ) * 100,
      ) / 100

      const overtimeDisplay =
        payroll.overtimeHours > 0
          ? Math.round(Number(payroll.overtimeHours) * hourlyRate * otRate)
          : 0
      const baseRowGain = Math.max(0, Math.round(employmentGross - overtimeDisplay))
      const rubricsSum =
        payroll.rubricLines?.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0) || 0
      const rubricsTowardNet =
        payroll.rubricLines?.reduce((sum: number, r: any) => {
          if (r.rubricType === "INDEMNITY" || r.isAlreadyDisbursed) return sum
          return sum + (Number(r.amount) || 0)
        }, 0) || 0
      const totalBrutAvecRubriques = Math.round((employmentGross + rubricsSum) * 100) / 100
      const totalDeductionsNum = Number(payroll.totalDeductions) || 0
      const netCoherent = Math.max(
        0,
        Math.round((employmentGross - totalDeductionsNum + rubricsTowardNet) * 100) / 100,
      )

      const paidTotal = Number(payroll.paidAmount) || 0
      // Même formule que le moteur de paie : brut emploi (temps + HS) − cotisations + rubriques.
      // Évite l’écart quand le brut stocké ne contient pas les HS mais une ligne HS est affichée.
      const netAPayerRestant = Math.max(0, netCoherent - paidTotal)

      const rubricsHorsNetLines =
        payroll.rubricLines?.filter(
          (r: any) => r.rubricType === "INDEMNITY" || r.isAlreadyDisbursed,
        ) || []
      const montantRubriquesDejaVerseesHorsNet = rubricsHorsNetLines.reduce(
        (s: number, r: any) => s + (Number(r.amount) || 0),
        0,
      )
      // Tout ce qui est déjà reçu : versements enregistrés sur le bulletin + indemnités / primes hors net
      const montantDejaVerseAffiche =
        Math.round((paidTotal + montantRubriquesDejaVerseesHorsNet) * 100) / 100

      const store = getPrimaryStoreForPayroll(user.storeUserRoles) as
        | BulletinEmployerStoreFields
        | null
      const {
        companyName,
        companyAddress,
        companyCity,
        companyPostalCode,
        companyCountry,
        companyPhone,
        companyEmail,
        rccmNumber,
        nifNumber,
        cnssEmployerNumber,
        companyLogo,
      } = getBulletinEmployerDisplay(store, companySettings)
      
      return `
      <div class="payslip ${index > 0 ? 'page-break' : ''}">
        <div class="header-section">
          <div class="employer-box">
            ${companyLogo ? `<img src="${companyLogo}" alt="Logo" class="company-logo" />` : ''}
            <h2>EMPLOYEUR</h2>
            <p class="company-name">${companyName}</p>
            <p>${companyAddress}</p>
            ${companyCity ? `<p>${companyPostalCode ? companyPostalCode + ' - ' : ''}${companyCity}${companyCountry ? ', ' + companyCountry : ''}</p>` : ''}
            ${rccmNumber ? `<p>RCCM: ${rccmNumber}</p>` : ''}
            ${nifNumber ? `<p>NIF: ${nifNumber}</p>` : ''}
            ${cnssEmployerNumber ? `<p>CNSS Emp.: ${cnssEmployerNumber}</p>` : ''}
            ${companyPhone ? `<p>Tél: ${companyPhone}</p>` : ''}
            ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ''}
          </div>
          <div class="payslip-title">
            <h1>BULLETIN DE PAIE</h1>
            <p class="period-label">${period.name}</p>
            <p class="period-dates">Du ${formatDate(period.startDate)} au ${formatDate(period.endDate)}</p>
            <p class="bulletin-number">N° ${payroll.number}</p>
          </div>
          <div class="employee-box">
            <h2>SALARIÉ</h2>
            <p class="employee-name">${user.firstName || ''} ${user.lastName || ''}</p>
            <p>Matricule: ${user.matricule || 'N/A'}</p>
            <p>Emploi: ${profile.position || 'N/A'}</p>
            <p>Contrat: ${contractTypeLabels[profile.contractType] || profile.contractType}</p>
            <p>Classification: ${profile.employeeType || 'N/A'}</p>
            ${profile.hireDate ? `<p>Date d'entrée: ${formatDate(profile.hireDate)}</p>` : ''}
            ${profile.contractEndDate ? `<p>Fin de contrat: ${formatDate(profile.contractEndDate)}</p>` : ''}
          </div>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th class="col-designation">DÉSIGNATION</th>
              <th class="col-base">BASE</th>
              <th class="col-taux">TAUX</th>
              <th class="col-gain">GAINS</th>
              <th class="col-retenue">RETENUES</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-header">
              <td colspan="5">RÉMUNÉRATION</td>
            </tr>
            <tr>
              <td>Salaire de base mensuel</td>
              <td class="center">${payroll.expectedWorkingDays} j</td>
              <td class="right">${formatCurrency(profile.baseSalary)}</td>
              <td class="right gain">${formatCurrency(baseRowGain)}</td>
              <td></td>
            </tr>

            ${payroll.overtimeHours > 0 ? `
            <tr class="section-header">
              <td colspan="5">HEURES SUPPLÉMENTAIRES</td>
            </tr>
            <tr>
              <td>Heures supplémentaires (taux × ${otRate})</td>
              <td class="center">${payroll.overtimeHours} h</td>
              <td class="right">${formatCurrency(Math.round(hourlyRate * otRate))}/h</td>
              <td class="right gain">${formatCurrency(overtimeDisplay)}</td>
              <td></td>
            </tr>
            ` : ''}

            ${payroll.rubricLines && payroll.rubricLines.filter((r: any) => r.rubricType === 'PRIME').length > 0 ? `
            <tr class="section-header">
              <td colspan="5">PRIMES</td>
            </tr>
            ${payroll.rubricLines.filter((r: any) => r.rubricType === 'PRIME').map((line: any) => `
            <tr>
              <td>${line.rubricName}</td>
              <td class="center">${line.rate ? formatCurrency(line.baseAmount) : ''}</td>
              <td class="right">${line.rate ? line.rate + '%' : ''}</td>
              <td class="right gain">${formatCurrency(line.amount)}</td>
              <td>${line.isSubjectToSocial && line.taxableAmount > 0 ? '<span style="font-size:8px;color:#666">*</span>' : ''}</td>
            </tr>
            `).join('')}
            ` : ''}

            ${payroll.rubricLines && payroll.rubricLines.filter((r: any) => r.rubricType === 'INDEMNITY').length > 0 ? `
            <tr class="section-header">
              <td colspan="5">INDEMNITÉS</td>
            </tr>
            ${payroll.rubricLines.filter((r: any) => r.rubricType === 'INDEMNITY').map((line: any) => `
            <tr>
              <td>${line.rubricName}${line.exemptAmount > 0 ? ' <span style="font-size:8px;color:#16a34a">(exonéré: ${formatCurrency(line.exemptAmount)})</span>' : ''}</td>
              <td class="center">${line.rate ? formatCurrency(line.baseAmount) : ''}</td>
              <td class="right">${line.rate ? line.rate + '%' : ''}</td>
              <td class="right gain">${formatCurrency(line.amount)}</td>
              <td>${line.isSubjectToSocial && line.taxableAmount > 0 ? '<span style="font-size:8px;color:#666">*</span>' : ''}</td>
            </tr>
            `).join('')}
            ` : ''}

            <tr class="subtotal-row subtotal-row-brut-gains">
              <td><strong>TOTAL BRUT + HEURES SUP + PRIMES + INDEMNITÉS</strong></td>
              <td></td>
              <td></td>
              <td class="right"><strong>${formatCurrency(totalBrutAvecRubriques)}</strong></td>
              <td></td>
            </tr>

            ${payroll.contributionLines && payroll.contributionLines.length > 0 ? `
            <tr class="section-header">
              <td colspan="5">COTISATIONS SOCIALES</td>
            </tr>
            ${payroll.contributionLines.map((line: any) => `
            <tr>
              <td>${line.contribution.name}</td>
              <td class="center">${formatCurrency(line.baseAmount)}</td>
              <td class="right">${formatContributionRatePercent(line.appliedRate)}</td>
              <td></td>
              <td class="right retenue">${formatCurrency(line.amount)}</td>
            </tr>
            `).join('')}
            ` : ''}

            <tr class="subtotal-row">
              <td><strong>TOTAL RETENUES</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td class="right"><strong>${formatCurrency(payroll.totalDeductions)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-left">
            <table class="summary-table">
              <tr>
                <td>Jours travaillés</td>
                <td class="right">${payroll.daysWorked} / ${payroll.expectedWorkingDays}</td>
              </tr>
              <tr>
                <td>Heures travaillées</td>
                <td class="right">${payroll.hoursWorked.toFixed(1)} h</td>
              </tr>
              ${payroll.daysWorked >= payroll.expectedWorkingDays && payroll.overtimeHours > 0 ? `
              <tr>
                <td>Heures supplémentaires</td>
                <td class="right">${payroll.overtimeHours.toFixed(1)} h</td>
              </tr>
              ` : ''}
              <tr>
                <td>Absences</td>
                <td class="right">${Math.max(0, payroll.expectedWorkingDays - payroll.daysWorked)} j</td>
              </tr>
            </table>
          </div>
          <div class="summary-right">
            <table class="summary-table summary-table-gains">
              <tr>
                <td>Salaire brut</td>
                <td class="right">${formatCurrency(baseRowGain)}</td>
              </tr>
              ${payroll.overtimeHours > 0 ? `
              <tr>
                <td>Heures supplémentaires</td>
                <td class="right">+ ${formatCurrency(overtimeDisplay)}</td>
              </tr>
              ` : ''}
              ${payroll.rubricLines && payroll.rubricLines.filter((r: any) => r.rubricType === 'PRIME').length > 0 ? `
              <tr>
                <td>Primes</td>
                <td class="right">+ ${formatCurrency(payroll.rubricLines.filter((r: any) => r.rubricType === 'PRIME').reduce((sum: number, r: any) => sum + r.amount, 0))}</td>
              </tr>
              ` : ''}
              ${payroll.rubricLines && payroll.rubricLines.filter((r: any) => r.rubricType === 'INDEMNITY').length > 0 ? `
              <tr>
                <td>Indemnités</td>
                <td class="right">+ ${formatCurrency(payroll.rubricLines.filter((r: any) => r.rubricType === 'INDEMNITY').reduce((sum: number, r: any) => sum + r.amount, 0))}</td>
              </tr>
              ` : ''}
              <tr class="summary-gains-total-row">
                <td><strong>Total brut</strong></td>
                <td class="right"><strong>${formatCurrency(totalBrutAvecRubriques)}</strong></td>
              </tr>
            </table>
            <div class="cnss-cotisations-box">
              <p class="cnss-cotisations-title">Cotisations CNSS</p>
              <table class="cnss-cotisations-table">
                <tr>
                  <td>CNSS Employé</td>
                  <td class="right">${formatCurrency(payroll.totalDeductions || 0)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <div class="payment-status-section">
          <h3 class="payment-status-title">ACCOMPTE</h3>
          <div class="payment-summary">
            <p><strong>Montant versé :</strong> ${formatCurrency(montantDejaVerseAffiche)}</p>
            <p><strong>Montant à verser :</strong> ${formatCurrency(netAPayerRestant)}</p>
          </div>
          <div class="net-restant-box">
            <p class="net-restant-label">NET À PAYER</p>
            <p class="net-restant-amount">${formatCurrency(netAPayerRestant)}</p>
          </div>
        </div>

        <div class="footer-section">
          <div class="payment-info">
            <p><strong>Mode de paiement :</strong> ${
              payroll.payments && payroll.payments.length > 0
                ? payroll.payments.length === 1
                  ? payroll.payments[0].paymentMode || "Paiement enregistré"
                  : "Paiements multiples"
                : "Virement bancaire"
            }</p>
            <p><strong>Statut :</strong> ${statusLabels[payroll.status] || payroll.status}${payroll.status === 'PARTIALLY_PAID' ? ` — Payé: ${formatCurrency(payroll.paidAmount)} | Reste: ${formatCurrency(payroll.remainingAmount)}` : ''}</p>
            <p><strong>Date ${payroll.status === 'PARTIALLY_PAID' ? 'dernier versement' : 'de paiement'} :</strong> ${payroll.paidAt ? formatDate(payroll.paidAt) : payroll.payments && payroll.payments.length > 0 ? formatDate(payroll.payments[payroll.payments.length - 1].paymentDate) : 'En attente'}</p>
          </div>
          <div class="signatures">
            <div class="signature-box">
              <p>L'Employeur</p>
              <div class="signature-space"></div>
              <p class="signature-line">Signature et cachet</p>
            </div>
            <div class="signature-box">
              <p>Le Salarié</p>
              <div class="signature-space"></div>
              <p class="signature-line">Lu et approuvé</p>
            </div>
          </div>
        </div>

        <div class="legal-notice">
          <p>Ce bulletin de paie doit être conservé sans limitation de durée.</p>
          <p>Document généré le ${formatDate(new Date())}</p>
        </div>
      </div>
    `}).join('')

    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bulletins de paie - ${payrolls.length} bulletin(s)</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #333;
          background: #f0f0f0;
        }
        
        .payslip {
          background: white;
          max-width: 210mm;
          margin: 20px auto;
          padding: 15mm;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .page-break {
          page-break-before: always;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #1e3a5f;
        }

        .employer-box, .employee-box {
          width: 30%;
          font-size: 10px;
        }

        .employer-box h2, .employee-box h2 {
          background: #1e3a5f;
          color: white;
          padding: 5px 10px;
          font-size: 11px;
          margin-bottom: 8px;
        }

        .employer-box p, .employee-box p {
          margin: 3px 0;
          padding-left: 5px;
        }

        .company-name, .employee-name {
          font-weight: bold;
          font-size: 12px;
          color: #1e3a5f;
        }

        .company-logo {
          max-width: 80px;
          max-height: 40px;
          margin-bottom: 5px;
          object-fit: contain;
        }

        .payslip-title {
          width: 35%;
          text-align: center;
        }

        .payslip-title h1 {
          color: #1e3a5f;
          font-size: 18px;
          margin-bottom: 10px;
          border: 2px solid #1e3a5f;
          padding: 8px;
        }

        .payslip-title .period-label {
          font-weight: bold;
          font-size: 14px;
          color: #1e3a5f;
        }

        .payslip-title .period-dates {
          font-size: 10px;
          color: #666;
          margin: 5px 0;
        }

        .payslip-title .bulletin-number {
          font-size: 11px;
          font-weight: bold;
          background: #e8f0fe;
          padding: 3px 8px;
          display: inline-block;
          margin-top: 5px;
        }

        .main-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10px;
        }

        .main-table th {
          background: #1e3a5f;
          color: white;
          padding: 8px 5px;
          text-align: left;
          font-weight: 600;
        }

        .main-table th.col-designation { width: 40%; }
        .main-table th.col-base { width: 15%; text-align: center; }
        .main-table th.col-taux { width: 15%; text-align: right; }
        .main-table th.col-gain { width: 15%; text-align: right; }
        .main-table th.col-retenue { width: 15%; text-align: right; }

        .main-table td {
          padding: 6px 5px;
          border-bottom: 1px solid #e0e0e0;
        }

        .main-table .center { text-align: center; }
        .main-table .right { text-align: right; }

        .main-table .section-header td {
          background: #e8f0fe;
          font-weight: bold;
          color: #1e3a5f;
          padding: 8px 5px;
        }

        .main-table .subtotal-row td {
          background: #f5f5f5;
          border-top: 2px solid #1e3a5f;
          border-bottom: 2px solid #1e3a5f;
        }

        .main-table .subtotal-row-brut-gains td {
          background: linear-gradient(
            135deg,
            rgba(220, 252, 231, 0.92) 0%,
            rgba(187, 247, 208, 0.88) 100%
          ) !important;
          color: #14532d;
          border-top: 2px solid rgba(22, 163, 74, 0.55);
          border-bottom: 2px solid rgba(22, 163, 74, 0.55);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .main-table .gain { color: #16a34a; }
        .main-table .retenue { color: #dc2626; }

        .summary-section {
          display: flex;
          justify-content: space-between;
          margin: 15px 0;
          gap: 20px;
        }

        .summary-left, .summary-right {
          width: 48%;
        }

        .summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .summary-table td {
          padding: 5px 8px;
          border: 1px solid #ddd;
        }

        .summary-table .right { text-align: right; }

        .summary-table-gains {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(22, 163, 74, 0.35);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .summary-table-gains td {
          background: rgba(236, 253, 245, 0.9);
          color: #14532d;
          border-color: rgba(134, 239, 172, 0.7);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .summary-table-gains .summary-gains-total-row td {
          background: rgba(187, 247, 208, 0.95);
          font-weight: 600;
          border-top: 2px solid rgba(22, 163, 74, 0.5);
        }

        .cnss-cotisations-box {
          margin-top: 10px;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          overflow: hidden;
        }

        .cnss-cotisations-title {
          background: #1e3a5f;
          color: white;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: bold;
          margin: 0;
        }

        .cnss-cotisations-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .cnss-cotisations-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .cnss-cotisations-table tr:last-child td {
          border-bottom: none;
        }

        .net-restant-box {
          margin: 12px 15px 15px;
          padding: 14px 16px;
          background: #1e3a5f;
          color: white;
          border-radius: 4px;
          text-align: center;
        }

        .net-restant-label {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }

        .net-restant-amount {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .employer-charges {
          text-align: right;
          font-size: 10px;
          color: #666;
          margin: 10px 0;
        }

        .footer-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }

        .payment-info {
          margin-bottom: 15px;
          font-size: 10px;
        }

        .payment-info p {
          margin: 3px 0;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }

        .signature-box {
          width: 40%;
          text-align: center;
        }

        .signature-box p {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .signature-space {
          height: 50px;
          border: 1px dashed #ccc;
          margin: 10px 0;
        }

        .signature-box .signature-line {
          font-size: 9px;
          color: #666;
          font-weight: normal;
        }

        .legal-notice {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 9px;
          color: #999;
        }

        .legal-notice p {
          margin: 2px 0;
        }

        .payment-status-section {
          margin: 15px 0;
          border: 1px solid #333;
          border-top: 2px solid #333;
        }

        .payment-status-title {
          background: #333;
          color: white;
          padding: 8px 15px;
          font-size: 12px;
          font-weight: bold;
          margin: 0;
        }

        .payment-summary {
          padding: 10px 15px;
          background: #f9f9f9;
        }

        .payment-summary p {
          margin: 3px 0;
          font-size: 10px;
        }

        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1e3a5f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 10px rgba(30, 58, 95, 0.3);
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #2d4a6f;
        }

        @media print {
          body {
            background: white;
          }
          
          .payslip {
            box-shadow: none;
            margin: 0;
            padding: 10mm;
            max-width: 100%;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .print-button {
            display: none;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">
        🖨️ Imprimer
      </button>
      
      ${payslipsHtml}
    </body>
    </html>
    `

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch (error) {
    console.error("Error generating payslips:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération des bulletins" },
      { status: 500 }
    )
  }
}
