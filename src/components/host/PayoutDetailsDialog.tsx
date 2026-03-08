import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HostPayout } from "./types/financial";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayoutDetailsDialogProps {
  payout: HostPayout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (date: string) => format(new Date(date), "d MMM yyyy", { locale: fr });
const formatDateTime = (date: string) => format(new Date(date), "d MMM yyyy à HH:mm", { locale: fr });

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  completed: "Terminé",
  failed: "Échoué",
  pending_guest_payment: "Paiement locataire en attente",
  settled: "Réglé",
  partially_settled: "Partiellement réglé",
  applied_to_debt: "Appliqué à la dette",
  cancelled: "Annulé",
  debit: "Débit",
};

export function PayoutDetailsDialog({ payout, open, onOpenChange }: PayoutDetailsDialogProps) {
  if (!payout) return null;

  const isPendingGuestPayment = payout.status === 'pending_guest_payment';
  const isDebtCollection = payout.transaction_type === 'debt_collection';
  const isRefundDebt = payout.transaction_type === 'refund_debt';
  const isDebtTransaction = isRefundDebt || isDebtCollection;
  const isCancellationFee = payout.transaction_type === 'cancelled';
  const hasDebtApplied = payout.total_dispute_refunds != null && payout.total_dispute_refunds > 0;
  const originalAmount = payout.original_amount ?? payout.amount;
  
  const baseSubtotal = payout.base_subtotal ?? 0;
  const baseCleaningFee = payout.base_cleaning_fee ?? 0;
  const grossRevenue = payout.gross_revenue ?? 0;
  
  const stayRevenue = baseSubtotal;
  const cleaningFee = baseCleaningFee;
  const grossTotal = grossRevenue;

  const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    booking_payout: "VERSEMENT",
    cancelled: "FRAIS D'ANNULATION",
    debt_collection: "RECOUVREMENT",
    refund_debt: "REMBOURSEMENT",
    refund: "REMBOURSEMENT",
    regular_earning: "REVENU",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du versement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cancellation Fee Explanation */}
          {isCancellationFee && payout.refund_percentage_applied != null && payout.refund_percentage_applied > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Revenu d'annulation :</strong> Le locataire a reçu un remboursement de {payout.refund_percentage_applied}%. Vous recevez le montant retenu ({100 - payout.refund_percentage_applied}%) moins la commission de la plateforme.
              </AlertDescription>
            </Alert>
          )}

          {/* 100% Retention Policy Explanation */}
          {isCancellationFee && (payout.refund_amount == null || payout.refund_amount === 0) && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm">
                <strong>Politique de rétention à 100% :</strong> La politique d'annulation de cette réservation n'accorde aucun remboursement au locataire. Vous recevez l'intégralité du montant retenu après commission.
              </AlertDescription>
            </Alert>
          )}

          {/* Debt Collection Explanation */}
          {isDebtCollection && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Revenu de recouvrement :</strong> Ce montant provient d'un litige résolu en votre faveur. Le locataire a payé ou paiera ce montant en compensation.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card - Only for regular earnings with debt applied */}
          {!isDebtTransaction && !isPendingGuestPayment && !isCancellationFee && hasDebtApplied && payout.amount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Versement prévu : <span className="font-semibold text-foreground">{formatPrice(originalAmount)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Remboursements litiges : <span className="font-semibold text-destructive">-{formatPrice(payout.total_dispute_refunds!)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Vous recevez : <span className="font-semibold text-primary">{formatPrice(payout.amount)}</span>
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Overview */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Aperçu de la transaction</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ID réservation :</span>
                <p className="font-mono mt-1">{payout.booking_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type de transaction :</span>
                <div className="mt-1">
                  <Badge 
                    variant={isRefundDebt ? "destructive" : isDebtCollection ? "default" : "default"}
                    className={
                      isCancellationFee 
                        ? "bg-amber-100 text-amber-700 border-amber-200" 
                        : isDebtCollection 
                        ? "bg-blue-100 text-blue-700 border-blue-200" 
                        : isRefundDebt
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : ""
                    }
                  >
                    {TRANSACTION_TYPE_LABELS[payout.transaction_type] || payout.transaction_type.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Statut :</span>
                <p className="font-medium mt-1">{STATUS_LABELS[payout.status] || payout.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Créé le :</span>
                <p className="mt-1">{formatDateTime(payout.created_at)}</p>
              </div>
              {payout.payout_date && (
                <div>
                  <span className="text-muted-foreground">Date de versement :</span>
                  <p className="mt-1">{formatDate(payout.payout_date)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          {payout.listing_title && (
            <>
              <div>
                <h3 className="font-semibold mb-3 text-lg">Détails de la réservation</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Annonce :</span>
                    <p className="font-medium mt-1">{payout.listing_title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Locataire :</span>
                    <p className="font-medium mt-1">{payout.guest_name}</p>
                  </div>
                  {payout.checkin_date && payout.checkout_date && (
                    <div>
                      <span className="text-muted-foreground">Période de séjour :</span>
                      <p className="mt-1">
                        {formatDate(payout.checkin_date)} - {formatDate(payout.checkout_date)}
                      </p>
                    </div>
                  )}
                  {payout.booking_status && (
                    <div>
                      <span className="text-muted-foreground">Statut réservation :</span>
                      <p className="font-medium mt-1">{STATUS_LABELS[payout.booking_status] || payout.booking_status}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Financial Breakdown */}
          <div>
            <h3 className="font-semibold mb-4 text-lg">
              {isPendingGuestPayment ? "Détails du paiement en attente" : isDebtCollection ? "Détails du recouvrement" : isRefundDebt ? "Détails de la dette" : "Détail financier"}
            </h3>
            
            {isPendingGuestPayment ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                  {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ID litige :</span>
                      <span className="font-mono">{payout.dispute_ids[0].substring(0, 8)}</span>
                    </div>
                  )}
                  {payout.dispute_category && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Catégorie :</span>
                      <span className="capitalize">{payout.dispute_category.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {payout.guest_debt_status && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Statut du paiement :</span>
                      <span className="capitalize">{payout.guest_debt_status}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-muted/30 border-2 border-border rounded-lg">
                  <span>Versement en attente</span>
                  <span className="font-mono">{formatPrice(payout.amount)}</span>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Ce versement sera traité une fois que le locataire aura réglé sa dette.
                </p>
              </div>
            ) : isDebtCollection ? (
              <div className="space-y-4">
                {(payout.dispute_ids?.length > 0 || payout.dispute_category || payout.guest_debt_status) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                    {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ID litige :</span>
                        <span className="font-mono">{payout.dispute_ids[0].substring(0, 8)}</span>
                      </div>
                    )}
                    {payout.dispute_category && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Catégorie :</span>
                        <span className="capitalize">{payout.dispute_category.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {payout.guest_debt_status && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Statut du paiement :</span>
                        <Badge variant="outline" className="capitalize">
                          {payout.guest_debt_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <span>Montant recouvré</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    +{formatPrice(Math.abs(payout.amount))}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Ce revenu provient d'un litige résolu en votre faveur. Le locataire a payé une compensation.
                </p>
              </div>
            ) : isRefundDebt ? (
              <div className="space-y-4">
                <Alert className="border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm">
                    <strong>Dette de remboursement :</strong> Ce montant représente un remboursement accordé au locataire. Il sera déduit de votre prochain versement pour cette réservation.
                  </AlertDescription>
                </Alert>

                {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                  <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ID litige :</span>
                      <span className="font-mono">{payout.dispute_ids[0].substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Motif :</span>
                      <span className="text-right">Remboursement approuvé par l'admin</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center font-bold text-lg py-4 px-4 bg-destructive/5 border-2 border-destructive/20 rounded-lg">
                  <span>Montant du remboursement</span>
                  <span className="font-mono text-destructive">
                    -{formatPrice(Math.abs(payout.amount))}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {payout.booking_status === 'confirmed' 
                    ? 'Cette dette sera automatiquement déduite à la fin de la réservation.'
                    : 'Cette dette représente un remboursement accordé au locataire.'}
                </p>
              </div>
            ) : (
              // DETAILED BREAKDOWN FOR REGULAR EARNINGS
              <div className="space-y-3 text-sm">
                {/* REVENUE SECTION */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenus</div>
                  
                  {stayRevenue > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Revenus du séjour</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +{formatPrice(stayRevenue)}
                      </span>
                    </div>
                  )}
                  
                  {cleaningFee > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">Frais de ménage</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        +{formatPrice(cleaningFee)}
                      </span>
                    </div>
                  )}
                  
                  {grossTotal > 0 && (
                    <div className="flex justify-between items-center font-medium pt-1 border-t">
                      <span>Total brut</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        {formatPrice(grossTotal)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* DEDUCTIONS SECTION */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Déductions</div>
                  
                  {/* Guest Refund for cancellations */}
                  {isCancellationFee && payout.refund_percentage_applied != null && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">
                        Remboursement locataire
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -{payout.refund_percentage_applied}%
                      </span>
                    </div>
                  )}
                  
                  {/* Retained Amount for cancellations */}
                  {isCancellationFee && payout.host_retained_gross != null && (
                    <div className="flex justify-between items-center pl-3 pt-2 border-t">
                      <span className="text-muted-foreground">Montant retenu</span>
                      <span className="font-mono">
                        {formatPrice(payout.host_retained_gross)}
                      </span>
                    </div>
                  )}
                  
                  {/* Platform Commission */}
                  {isCancellationFee ? (
                    payout.commission_on_retained != null && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-muted-foreground">Commission plateforme (sur retenu)</span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          -{formatPrice(payout.commission_on_retained)}
                        </span>
                      </div>
                    )
                  ) : (
                    payout.commission_amount != null && payout.commission_amount > 0 && (
                      <div className="flex justify-between items-center pl-3">
                        <span className="text-muted-foreground">Commission plateforme</span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          -{formatPrice(Math.abs(payout.commission_amount))}
                        </span>
                      </div>
                    )
                  )}
                  
                  {/* Dispute refunds */}
                  {!isCancellationFee && payout.total_dispute_refunds != null && payout.total_dispute_refunds > 0 && (
                    <div className="flex justify-between items-center pl-3">
                      <span className="text-muted-foreground">
                        Remboursement{payout.dispute_ids && payout.dispute_ids.length > 1 ? 's' : ''} litige
                        {payout.dispute_ids && payout.dispute_ids.length > 0 && (
                          <span className="text-xs ml-1">
                            ({payout.dispute_ids.length} litige{payout.dispute_ids.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        -{formatPrice(payout.total_dispute_refunds)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* NET PAYOUT (BEFORE DEBTS) */}
                {payout.booking_host_payout_net != null && payout.booking_host_payout_net > 0 && (
                  <div className="flex justify-between items-center font-medium py-2 px-3 bg-muted/50 rounded">
                    <span>Versement net (avant dettes)</span>
                    <span className="font-mono text-base">
                      {formatPrice(payout.booking_host_payout_net)}
                    </span>
                  </div>
                )}

                <Separator className="my-4" />

                {/* FINAL PAYOUT */}
                <div className="flex justify-between items-center font-bold text-lg py-3 px-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                  <span>VERSEMENT FINAL</span>
                  <span className="font-mono text-primary">
                    {formatPrice(payout.amount)}
                  </span>
                </div>

                {payout.amount <= 0 && hasDebtApplied && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Ce versement a été entièrement compensé par les dettes en cours. Aucun paiement ne sera effectué.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {payout.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-lg">Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {payout.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
