// src/app/(main)/(private-pages)/cliente/perfil/page.tsx

"use client";

import { UserProfile } from "@/components/features/perfil/UserProfile";

export default function ClienteProfilePage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <UserProfile />
      {/* Add client-specific profile sections here if needed */}
    </div>
  );
}
