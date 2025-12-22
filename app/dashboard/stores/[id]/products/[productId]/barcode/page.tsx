"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer } from "lucide-react"
import { toast } from "sonner"
import JsBarcode from "jsbarcode"

export default function BarcodePrintPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const barcodeRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const hasTriggeredPrintRef = useRef(false)
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [barcodesRendered, setBarcodesRendered] = useState(false)

  const storeId = params.id as string
  const productId = params.productId as string
  const quantity = parseInt(searchParams.get("quantity") ?? "1", 10) || 1

  const formatDateCode = (d: Date) => {
    const yyyy = String(d.getFullYear())
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    const ms = String(d.getMilliseconds()).padStart(3, "0")
    return `${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`
  }

  const [dateCode] = useState(() => formatDateCode(new Date()))

  useEffect(() => {
    let cancelled = false
    const loadProduct = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/products/${productId}`)
        if (!response.ok) {
          throw new Error("Produit non trouvé")
        }
        const data = await response.json()
        if (!cancelled) {
          setProduct(data)
        }
      } catch (err) {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error("Erreur lors du chargement du produit")
          setError(e)
          toast.error("Erreur lors du chargement du produit")
          router.push(`/dashboard/stores/${storeId}/products`)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    if (productId) {
      loadProduct()
    }

    return () => {
      cancelled = true
    }
  }, [productId, router, storeId])

  // Générer les codes-barres
  useEffect(() => {
    setBarcodesRendered(false)
    if (product && barcodeRefs.current.length > 0) {
      barcodeRefs.current.forEach((ref, index) => {
        if (ref) {
          try {
            JsBarcode(ref, product.sku || product.id, {
              format: "CODE128",
              lineColor: "#000",
              width: 1.3,
              height: 48,
              displayValue: false,
              font: "Arial",
              fontSize: 10,
              margin: 0,
            })
          } catch (err) {
            console.error('Erreur lors de la génération du code-barres:', err)
          }
        }
      })
      setBarcodesRendered(true)
    }
  }, [product, quantity])

  useEffect(() => {
    if (hasTriggeredPrintRef.current) return
    if (isLoading) return
    if (!product) return
    if (!barcodesRendered) return

    hasTriggeredPrintRef.current = true
    const t = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => {
      window.clearTimeout(t)
    }
  }, [barcodesRendered, isLoading, product])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return null
  }

  return (
    <div id="print-content" className="barcode-print-page">
      <div className="flex justify-between items-center mb-6 no-print">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/stores/${storeId}/products`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux produits
        </Button>
        <Button onClick={handlePrint} className="mb-4">
          <Printer className="h-4 w-4 mr-2" />
          Imprimer
        </Button>
      </div>

      <div className="sheet-header">
        <div className="sheet-title">
          {product?.name}
        </div>
      </div>

      <div className="labels-grid">
        {Array.from({ length: quantity }).map((_, index) => (
          <div key={index} className="label">
            <div className="label-name">{product?.name}</div>
            {typeof product?.prixVente === "number" && (
              <div className="label-price">
                {Number(product.prixVente).toLocaleString("fr-FR")}
                <span className="currency-sup">FCFA</span>
              </div>
            )}
            <canvas
              ref={(el) => {
                barcodeRefs.current[index] = el
              }}
              className="label-barcode"
            />
            <div className="label-date">{dateCode}</div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 6mm;
        }

        .barcode-print-page {
          padding: 16px;
          background: #fff;
        }

        .sheet-header {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .sheet-title {
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .labels-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border: 1px solid #d1d5db;
        }

        .label {
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          padding: 8px 6px;
          min-height: 92px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          break-inside: avoid;
        }

        .labels-grid .label:nth-child(4n) {
          border-right: none;
        }

        .label-name {
          font-size: 10px;
          font-weight: 400;
          line-height: 1.2;
          margin-bottom: 2px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .label-price {
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 4px;
          background-color: #fe0c21;
          color: white;
          padding: 6px 8px 4px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 2px;
          line-height: 1;
        }

        .currency-sup {
          font-size: 10px;
          font-weight: 700;
          margin-top: 4px;
          line-height: 1;
        }

        .label-barcode {
          width: 100%;
          height: 48px;
        }

        .label-code {
          font-size: 10px;
          margin-top: 3px;
          letter-spacing: 0.4px;
        }

        .label-date {
          font-size: 9px;
          margin-top: 2px;
          letter-spacing: 0.4px;
          color: #6b7280;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }

          .barcode-print-page {
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}
