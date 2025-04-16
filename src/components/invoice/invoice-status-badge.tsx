import { Badge } from "@/components/ui/badge"
import { INVOICE_STATUS } from "@/lib/constants/invoice"
import { InvoiceService } from "@/lib/services/invoice-service"

interface InvoiceStatusBadgeProps {
  status: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS]
  size?: "sm" | "md" | "lg"
  className?: string
}

export function InvoiceStatusBadge({
  status,
  size = "md",
  className = "",
}: InvoiceStatusBadgeProps) {
  // Get label based on status
  const getStatusLabel = () => {
    switch (status) {
      case INVOICE_STATUS.PENDING:
        return "Pendente"
      case INVOICE_STATUS.PAID:
        return "Pago"
      case INVOICE_STATUS.OVERDUE:
        return "Vencido"
      case INVOICE_STATUS.CANCELED:
        return "Cancelado"
      case INVOICE_STATUS.PROCESSING:
        return "Em processamento"
      default:
        return "Desconhecido"
    }
  }

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs px-1.5 py-0.5"
      case "lg":
        return "text-sm px-3 py-1.5"
      case "md":
      default:
        return "text-sm px-2 py-1"
    }
  }

  return (
    <Badge
      className={`font-normal ${InvoiceService.getStatusColor(status)} ${getSizeClasses()} ${className}`}
    >
      {getStatusLabel()}
    </Badge>
  )
} 