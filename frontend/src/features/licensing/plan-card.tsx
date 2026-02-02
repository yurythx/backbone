import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { Plan } from "@/types"

interface PlanCardProps {
    plan: Plan
    isCurrent: boolean
    onUpgrade: (planId: number) => void
    isLoading?: boolean
}

export function PlanCard({ plan, isCurrent, onUpgrade, isLoading }: PlanCardProps) {
    const isFree = parseFloat(plan.price) === 0

    return (
        <Card className={`relative flex flex-col ${isCurrent ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
            {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    Plano Atual
                </div>
            )}

            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                    {isFree ? (
                        <span className="text-3xl font-bold text-foreground">Grátis</span>
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-foreground">R$ {plan.price}</span>
                            <span className="text-muted-foreground">/mês</span>
                        </div>
                    )}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
                <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-muted-foreground">
                                {feature.feature_name}: <strong>{feature.value === 'true' ? 'Sim' : feature.value}</strong>
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter>
                <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    onClick={() => onUpgrade(plan.id)}
                    disabled={isCurrent || isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isCurrent ? (
                        "Plano Atual"
                    ) : (
                        "Escolher Plano"
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
