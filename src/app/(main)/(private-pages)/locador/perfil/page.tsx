// src/app/(main)/(private-pages)/locador/perfil/page.tsx
"use client";

import { UserProfile } from "@/components/features/perfil/UserProfile";

export default function LocadorProfilePage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <UserProfile />
      {/* Add energy renter-specific profile sections here if needed */}
    </div>
  );
}