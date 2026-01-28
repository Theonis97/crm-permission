import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Générer une page HTML imprimable pour les bulletins sélectionnés
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

    // Récupérer les bulletins avec leurs détails
    const payrolls = await prisma.payroll.findMany({
      where: {
        id: { in: ids },
        status: { in: ["VALIDATED", "APPROVED", "PAID"] },
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
                  include: {
                    store: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                        phone: true,
                        email: true,
                      },
                    },
                  },
                  take: 1,
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
        adjustments: true,
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
          <p>Seuls les bulletins validés, approuvés ou payés peuvent être imprimés.</p>
          <button onclick="window.close()">Fermer</button>
        </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      )
    }

    // Générer le HTML pour l'impression
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
      PAID: "Payé",
    }

    const contractTypeLabels: Record<string, string> = {
      CDI: "Contrat à Durée Indéterminée",
      CDD: "Contrat à Durée Déterminée",
      STAGE: "Stage",
      INTERIM: "Intérim",
      FREELANCE: "Freelance",
    }

    const payslipsHtml = payrolls.map((payroll: any, index: number) => {
      const profile = payroll.employeeProfile
      const user = profile.user
      const period = payroll.period
      const hourlyRate = profile.baseSalary / (payroll.expectedWorkingDays * profile.workingHoursPerDay)
      
      // Récupérer les informations de la boutique de l'employé
      const storeRole = user.storeUserRoles?.[0]
      const store = storeRole?.store
      const storeName = store?.name || 'Non défini'
      const storeAddress = store?.address || 'Adresse non définie'
      const storePhone = store?.phone || ''
      const storeEmail = store?.email || ''
      
      return `
      <div class="payslip ${index > 0 ? 'page-break' : ''}">
        <!-- En-tête avec informations employeur et employé -->
        <div class="header-section">
          <div class="employer-box">
            <h2>EMPLOYEUR</h2>
            <p class="company-name">${storeName}</p>
            <p>Adresse: ${storeAddress}</p>
            ${storePhone ? `<p>Tél: ${storePhone}</p>` : ''}
            ${storeEmail ? `<p>Email: ${storeEmail}</p>` : ''}
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
          </div>
        </div>

        <!-- Tableau principal du bulletin -->
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
            <!-- Section Salaire de base -->
            <tr class="section-header">
              <td colspan="5">RÉMUNÉRATION</td>
            </tr>
            <tr>
              <td>Salaire de base mensuel</td>
              <td class="center">${payroll.expectedWorkingDays} j</td>
              <td class="right">${formatCurrency(profile.baseSalary)}</td>
              <td class="right gain">${formatCurrency(payroll.grossSalary)}</td>
              <td></td>
            </tr>
            ${payroll.overtimeHours > 0 ? `
            <tr>
              <td>Heures supplémentaires</td>
              <td class="center">${payroll.overtimeHours.toFixed(1)} h</td>
              <td class="right">${formatCurrency(Math.round(hourlyRate * profile.overtimeRate))}/h</td>
              <td class="right gain">${formatCurrency(Math.round(payroll.overtimeHours * hourlyRate * profile.overtimeRate))}</td>
              <td></td>
            </tr>
            ` : ''}
            ${payroll.totalBonuses > 0 ? `
            <tr>
              <td>Primes et indemnités</td>
              <td></td>
              <td></td>
              <td class="right gain">${formatCurrency(payroll.totalBonuses)}</td>
              <td></td>
            </tr>
            ` : ''}
            
            <!-- Ligne Total Brut -->
            <tr class="subtotal-row">
              <td><strong>SALAIRE BRUT</strong></td>
              <td></td>
              <td></td>
              <td class="right"><strong>${formatCurrency(payroll.grossSalary + payroll.totalBonuses)}</strong></td>
              <td></td>
            </tr>

            ${payroll.contributionLines && payroll.contributionLines.length > 0 ? `
            <!-- Section Cotisations -->
            <tr class="section-header">
              <td colspan="5">COTISATIONS SOCIALES</td>
            </tr>
            ${payroll.contributionLines.map((line: any) => `
            <tr>
              <td>${line.contribution.name}</td>
              <td class="center">${formatCurrency(line.baseAmount)}</td>
              <td class="right">${(line.appliedRate * 100).toFixed(2)}%</td>
              <td></td>
              <td class="right retenue">${formatCurrency(line.amount)}</td>
            </tr>
            `).join('')}
            ` : ''}

            <!-- Ligne Total Retenues -->
            <tr class="subtotal-row">
              <td><strong>TOTAL RETENUES</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td class="right"><strong>${formatCurrency(payroll.totalDeductions)}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Récapitulatif -->
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
              <tr>
                <td>Heures supplémentaires</td>
                <td class="right">${payroll.overtimeHours.toFixed(1)} h</td>
              </tr>
              <tr>
                <td>Absences</td>
                <td class="right">${payroll.absenceDays} j</td>
              </tr>
            </table>
          </div>
          <div class="summary-right">
            <table class="summary-table">
              <tr>
                <td>Salaire brut</td>
                <td class="right">${formatCurrency(payroll.grossSalary)}</td>
              </tr>
              <tr>
                <td>Primes</td>
                <td class="right">+ ${formatCurrency(payroll.totalBonuses)}</td>
              </tr>
              <tr>
                <td>Cotisations salariales</td>
                <td class="right">- ${formatCurrency(payroll.totalDeductions)}</td>
              </tr>
              <tr class="net-row">
                <td><strong>NET À PAYER</strong></td>
                <td class="right"><strong>${formatCurrency(payroll.netSalary)}</strong></td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Net à payer en toutes lettres -->
        <div class="net-in-words">
          <p><strong>Net à payer :</strong> ${formatCurrency(payroll.netSalary)}</p>
        </div>

        <!-- Charges patronales (info) -->
        ${payroll.employerCharges > 0 ? `
        <div class="employer-charges">
          <p><em>Charges patronales : ${formatCurrency(payroll.employerCharges)}</em></p>
        </div>
        ` : ''}

        <!-- Pied de page -->
        <div class="footer-section">
          <div class="payment-info">
            <p><strong>Mode de paiement :</strong> Virement bancaire</p>
            <p><strong>Date de paiement :</strong> ${payroll.paidAt ? formatDate(payroll.paidAt) : 'En attente'}</p>
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

        /* En-tête avec 3 colonnes */
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

        /* Tableau principal */
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

        .main-table .gain { color: #16a34a; }
        .main-table .retenue { color: #dc2626; }

        /* Section récapitulative */
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

        .summary-table .net-row {
          background: #1e3a5f;
          color: white;
        }

        .summary-table .net-row td {
          padding: 10px 8px;
          font-size: 12px;
        }

        /* Net à payer */
        .net-in-words {
          background: #e8f0fe;
          padding: 10px 15px;
          margin: 15px 0;
          border-left: 4px solid #1e3a5f;
          font-size: 12px;
        }

        .employer-charges {
          text-align: right;
          font-size: 10px;
          color: #666;
          margin: 10px 0;
        }

        /* Pied de page */
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

        /* Bouton d'impression */
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

        /* Styles d'impression */
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
      
      <script>
        // Auto-print si demandé
        // window.onload = function() { window.print(); }
      </script>
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
