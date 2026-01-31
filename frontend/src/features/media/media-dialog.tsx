"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { MediaManager } from "./media-manager"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon } from "lucide-react"

interface MediaDialogProps {
    onSelect: (url: string) => void
    trigger?: React.ReactNode
}

export function MediaDialog({ onSelect, trigger }: MediaDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Biblioteca de Mídia
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Selecionar Mídia</DialogTitle>
                </DialogHeader>
                <MediaManager selectable onSelect={onSelect} />
            </DialogContent>
        </Dialog>
    )
}
