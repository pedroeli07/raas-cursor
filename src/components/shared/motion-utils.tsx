import { motion, HTMLMotionProps } from 'framer-motion';
import React, { CSSProperties } from 'react';

// Criando componentes Motion com tipagem que inclui className
type MotionDivProps = HTMLMotionProps<"div"> & {
  className?: string;
};



/**
 * Função que combina múltiplas classes CSS em uma única string
 */
export const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Tipo que permite adicionar className a componentes motion
 */
export type WithClassName<P = Record<string, unknown>> = P & { className?: string };

/**
 * Função utilitária que permite usar className e style com componentes motion
 * Esta função é um truque para contornar o erro de tipagem, mas na prática não faz nada
 * além de retornar exatamente o que recebeu
 */
export function motionProps<T>(props: Record<string, unknown>): T {
  return props as T;
}

/**
 * Função que combina className com style
 * Útil quando você precisa aplicar estilos inline e className ao mesmo tempo
 */
export function combineStyles(className: string, style: CSSProperties) {
  return { className, style };
}

// Componente Motion.div que aceita className
export const MotionDiv: React.FC<MotionDivProps> = React.forwardRef<HTMLDivElement, MotionDivProps>(
  (props, ref) => <motion.div {...props} ref={ref} />
);
MotionDiv.displayName = 'MotionDiv';



// Para simplificar, vamos criar apenas os componentes mais utilizados manualmente
// em vez de usar a função createMotionComponent que estava causando erros de tipagem

// Span
export const MotionSpan: React.FC<HTMLMotionProps<"span"> & { className?: string }> = 
  React.forwardRef<HTMLSpanElement, HTMLMotionProps<"span"> & { className?: string }>((props, ref) => 
    <motion.span {...props} ref={ref} />
);
MotionSpan.displayName = 'MotionSpan';

// Paragraph
export const MotionP: React.FC<HTMLMotionProps<"p"> & { className?: string }> = 
  React.forwardRef<HTMLParagraphElement, HTMLMotionProps<"p"> & { className?: string }>((props, ref) => 
    <motion.p {...props} ref={ref} />
);
MotionP.displayName = 'MotionP';

// H1
export const MotionH1: React.FC<HTMLMotionProps<"h1"> & { className?: string }> = 
  React.forwardRef<HTMLHeadingElement, HTMLMotionProps<"h1"> & { className?: string }>((props, ref) => 
    <motion.h1 {...props} ref={ref} />
);
MotionH1.displayName = 'MotionH1';

// UL
export const MotionUl: React.FC<HTMLMotionProps<"ul"> & { className?: string }> = 
  React.forwardRef<HTMLUListElement, HTMLMotionProps<"ul"> & { className?: string }>((props, ref) => 
    <motion.ul {...props} ref={ref} />
);
MotionUl.displayName = 'MotionUl';

// LI
export const MotionLi: React.FC<HTMLMotionProps<"li"> & { className?: string }> = 
  React.forwardRef<HTMLLIElement, HTMLMotionProps<"li"> & { className?: string }>((props, ref) => 
    <motion.li {...props} ref={ref} />
);
MotionLi.displayName = 'MotionLi';

// Section
export const MotionSection: React.FC<HTMLMotionProps<"section"> & { className?: string }> = 
  React.forwardRef<HTMLElement, HTMLMotionProps<"section"> & { className?: string }>((props, ref) => 
    <motion.section {...props} ref={ref} />
);
MotionSection.displayName = 'MotionSection';

// Button
export const MotionButton: React.FC<HTMLMotionProps<"button"> & { className?: string }> = 
  React.forwardRef<HTMLButtonElement, HTMLMotionProps<"button"> & { className?: string }>((props, ref) => 
    <motion.button {...props} ref={ref} />
);
MotionButton.displayName = 'MotionButton';