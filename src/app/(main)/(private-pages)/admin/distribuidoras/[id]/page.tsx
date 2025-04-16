//src/app/(main)/(private-pages)/admin/distribuidoras/[id]/page.tsx
import { DistributorDetailsPage } from '@/components/ux/DistributorDetailsPage';

export default function AdminDistributorDetailPageWrapper({ params }: { params: { id: string } }) {
  return <DistributorDetailsPage distributorId={params.id} />;
}