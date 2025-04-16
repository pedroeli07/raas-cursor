// path: src/app/(main)/(private-pages)/admin/perfil/page.tsx

"use client";

import { UserProfile } from "@/components/features/perfil/UserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminProfilePage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <UserProfile />
      {/* Add admin-specific profile sections here if needed */}
      {/* Example: Settings management, etc. */}
      {/* <Card className="mt-8">
        <CardHeader>
          <CardTitle>Configurações de Administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Seção para configurações específicas do admin.</p>
              </CardContent>
      </Card> */}
    </div>
  );
} 