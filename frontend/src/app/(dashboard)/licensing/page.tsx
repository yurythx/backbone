"use client"

import { LicenseInfo } from "@/features/licensing/license-info"

export default function LicensingPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Licensing</h2>
      <div className="max-w-2xl">
        <LicenseInfo />
      </div>
    </div>
  )
}
