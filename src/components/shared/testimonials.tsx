'use client';


import FadeIn from './FadeIn';

const testimonials = [
  {
    body: 'Desde que aderi ao RaaS, minha conta de luz reduziu em mais de 15%. O processo foi simples e não precisei investir em equipamentos caros. Recomendo a todos!',
    author: {
      name: 'Juliana Mendes',
      role: 'Cliente Residencial',
      imageUrl: '/raas_mulher.png',
    },
  },
  {
    body: 'Nossa empresa reduziu significativamente os custos operacionais após aderir ao RaaS. O retorno sobre investimento foi imediato e o atendimento da equipe é excepcional.',
    author: {
      name: 'Ricardo Oliveira',
      role: 'CEO, TechSolutions',
      imageUrl: '/raas_mulher.png',
    },
  },
  {
    body: 'A consultoria energética que recebemos foi fundamental para entendermos como otimizar nosso consumo. Excelente equipe de profissionais que realmente entendem do assunto.',
    author: {
      name: 'Carla Santos',
      role: 'Gerente Administrativa',
      imageUrl: '/raas_mulher.png',
    },
  },
];

const Testimonials = () => {
  return (
    <div className="py-24 sm:py-32 bg-gradient-to-b from-[#1a2942] to-[#0A1628]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-[#34d399]">Depoimentos</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              O que nossos clientes dizem
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Veja como nossas soluções têm transformado a vida de pessoas e empresas em todo o Brasil.
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-2 lg:columns-3">
            {testimonials.map((testimonial, index) => (
              <FadeIn key={index} delay={0.1 * index}>
                <div className="pt-8 sm:inline-block sm:w-full sm:px-4">
                  <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 h-full flex flex-col">
                    <blockquote className="text-gray-300 leading-6 flex-grow">
                      <p>&quot;{testimonial.body}&quot;</p>
                    </blockquote>
                    <div className="mt-6 flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden">
                        <img
                          className="h-full w-full object-cover"
                          src={testimonial.author.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                        />
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-medium text-white">{testimonial.author.name}</div>
                        <div className="text-sm text-gray-400">{testimonial.author.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials; 