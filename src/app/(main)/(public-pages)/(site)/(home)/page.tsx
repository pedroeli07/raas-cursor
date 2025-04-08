
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/20 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Energia Solar Acessível para Todos
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Economize na conta de luz com energia limpa sem precisar instalar painéis solares
            </p>
            <Link 
              href="/register" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Comece Agora
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Economia Garantida</h3>
              <p className="text-muted-foreground">
                Reduza sua conta de energia elétrica sem investimento inicial
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Energia Limpa</h3>
              <p className="text-muted-foreground">
                Contribua para um futuro sustentável com energia solar
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Sem Instalação</h3>
              <p className="text-muted-foreground">
                Aproveite os benefícios da energia solar sem obras ou reformas
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
