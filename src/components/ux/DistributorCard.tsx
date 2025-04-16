import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, DollarSign, Clock, Building, Home } from 'lucide-react';
import { Distributor as AppDistributor } from '@/lib/types/app-types'; // Use AppDistributor directly

interface DistributorCardProps {
  distributor: AppDistributor;
  index: number;
  formatDate: (date: string | Date) => string;
  formatCurrency: (value: number) => string;
  onEdit: (distributor: AppDistributor) => void;
  onDelete: (distributor: AppDistributor) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

export const DistributorCard: React.FC<DistributorCardProps> = React.memo(({
  distributor,
  index,
  formatDate,
  formatCurrency,
  onEdit,
  onDelete,
}) => {
  const address = distributor.address;
  const addressString = address
    ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`
    : 'Endereço não cadastrado';
  
  // Garantir que o preço seja um número válido
  const formattedPrice = distributor.pricePerKwh || 0;

  // Calculate installation count (placeholder)
  const installationCount = (distributor as any).installations?.length ?? 0;

  return (
    <motion.div
      // key é adicionado no componente pai
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="distributor-card"
      data-id={distributor.id}
    >
      <Card className="h-full flex flex-col justify-between border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{distributor.name || 'Nome não disponível'}</CardTitle>
          <CardDescription>Instalações: {installationCount}</CardDescription>
        </CardHeader>
        <CardContent className="py-2 space-y-2 text-sm flex-grow">
          <div className="flex items-center text-muted-foreground">
            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatCurrency(formattedPrice)} / kWh</span>
          </div>
          <div className="flex items-start text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{addressString}</span>
          </div>
           <div className="flex items-center text-muted-foreground pt-1">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Criado em: {formatDate(distributor.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-3">
            <Home className="h-4 w-4 text-primary" />
            <span className="font-medium">Instalações:</span>
            <span className="text-muted-foreground">{distributor.installationsCount || "Carregando..."}</span>
          </div>
        </CardContent>
        <CardFooter className="py-2 flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(distributor)} className="w-full gap-1.5 border-border hover:border-primary/50">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(distributor)}
            className="w-full gap-1.5 border-border text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
});

DistributorCard.displayName = 'DistributorCard'; 