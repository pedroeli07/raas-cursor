//src/app/(main)/(private-pages)/admin/instalacoes/[id]/page.tsx
import { InstallationDetailsPage } from '@/components/ux/InstallationDetailsPage';

export default function AdminInstallationDetailPageWrapper({ params }: { params: { id: string } }) {
  return <InstallationDetailsPage installationId={params.id} />;
}