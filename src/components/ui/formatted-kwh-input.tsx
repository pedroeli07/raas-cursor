import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { frontendLog } from "@/lib/logs/logger";

/**
 * FormattedKwhInput - Um componente especializado para entrada de preços por kWh
 * 
 * Este componente facilita a entrada de valores de preço por kWh, permitindo:
 * - Entrada de valores decimais com ponto ou vírgula como separador decimal
 * - Conversão automática de valores inteiros grandes (ex: 976) para o formato decimal adequado (0.976)
 * - Formatação na perda de foco para melhor exibição
 * - Remoção de zeros desnecessários à direita
 * 
 * O componente mantém internamente um valor raw (string) para exibição e manipulação da UI,
 * enquanto expõe um valor numérico através das props value/onChange para integração fácil com
 * bibliotecas de formulários como React Hook Form.
 * 
 * @example
 * // Com React Hook Form
 * <FormField
 *   control={form.control}
 *   name="pricePerKwh"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Preço por kWh (R$)</FormLabel>
 *       <FormControl>
 *         <FormattedKwhInput 
 *           value={field.value} 
 *           onChange={field.onChange}
 *           onBlur={field.onBlur}
 *           placeholder="0.85"
 *         />
 *       </FormControl>
 *     </FormItem>
 *   )}
 * />
 * 
 * @param props.value Valor numérico atual (number | undefined)
 * @param props.onChange Callback chamado quando o valor muda, recebe o novo valor numérico
 * @param props.onBlur Callback opcional chamado quando o campo perde o foco
 */
interface FormattedKwhInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: number | undefined;
  onChange: (value: number) => void;
  onBlur?: () => void;
}

export function FormattedKwhInput({
  value,
  onChange,
  onBlur,
  className,
  ...props
}: FormattedKwhInputProps) {
  // Para tratar a entrada do usuário, mantemos o valor bruto do input
  const [rawInputValue, setRawInputValue] = useState<string>("");

  // Formata o número para exibição na interface
  const formatForDisplay = (num: number): string => {
    // Se o número for 0, retorna uma string vazia ou "0" dependendo da sua preferência
    if (num === 0) return "";

    // CONVERSÃO REMOVIDA DAQUI - Esta função apenas formata
    // if (num >= 10 && Number.isInteger(num)) {
    //   frontendLog.debug(`FormattedKwhInput: convertendo valor inteiro ${num} para decimal ${num/1000}`);
    //   num = num / 1000;
    // }

    // Converte para string com até 5 casas decimais e sem zeros à direita desnecessários
    // Usamos toFixed para garantir precisão e depois removemos zeros à direita e ponto decimal desnecessário
    // Aumentei para 6 casas para garantir que 0.976 não seja arredondado para 1.0
    let formatted = num.toFixed(6).replace(/\.?0+$/, '');
    // Se terminar com ponto decimal, remove-o também
    if (formatted.endsWith('.')) {
        formatted = formatted.slice(0, -1);
    }
    return formatted;
  };

  // Quando o valor externo muda, atualizamos o valor bruto do input
  useEffect(() => {
    // Only update raw input if it differs from the formatted prop value
    // This prevents overwriting user input during typing
    const formattedPropValue = value !== undefined ? formatForDisplay(value) : "";
    if (rawInputValue !== formattedPropValue) {
        frontendLog.debug(`FormattedKwhInput: Valor externo mudou. Prop: ${value}, Formatado: ${formattedPropValue}`);
        setRawInputValue(formattedPropValue);
    } else {
        frontendLog.debug(`FormattedKwhInput: Valor externo igual ao raw, não atualizando state interno.`);
    }
  }, [value]); // Depender apenas de 'value'

  // Quando o usuário digita no campo
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    frontendLog.debug(`FormattedKwhInput: Input mudou para: ${inputValue}`);

    // Permite apenas números, ponto e vírgula
    if (!/^[0-9]*([.,])?[0-9]*$/.test(inputValue) && inputValue !== "") {
        frontendLog.warn(`FormattedKwhInput: Input inválido descartado: ${inputValue}`);
        return; // Ignora caracteres inválidos
    }

    // Atualiza o valor raw para exibição imediata
    setRawInputValue(inputValue);

    // Converte para número, tratando vírgula
    const sanitizedInput = inputValue.replace(",", ".");
    let numericValue = sanitizedInput === "" ? 0 : parseFloat(sanitizedInput);

    // Se for um número inválido após parse, propaga 0 ou mantém o último válido?
    // Por enquanto, propagamos 0 se o parse falhar ou for vazio
    if (isNaN(numericValue)) {
        numericValue = 0;
    }

    // LÓGICA DE CONVERSÃO CENTRALIZADA AQUI:
    // Se o usuário digitou um número inteiro >= 10 (e sem separador decimal explícito)
    const isIntegerInput = /^[0-9]+$/.test(inputValue);
    if (isIntegerInput && numericValue >= 10) {
        const convertedValue = numericValue / 1000;
        frontendLog.debug(`FormattedKwhInput: Detectado inteiro >= 10 (${numericValue}). Convertendo para ${convertedValue}`);
        numericValue = convertedValue; // Atualiza o valor numérico a ser propagado
    }

    frontendLog.debug(`FormattedKwhInput: Chamando onChange com valor numérico: ${numericValue}`);
    onChange(numericValue);
  };

  // Quando o campo perde o foco, formatamos o valor para garantir consistência
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    frontendLog.debug(`FormattedKwhInput: Blur event. Valor atual (prop): ${value}`);
    // Se tiver onBlur customizado, chama
    if (onBlur) {
        onBlur();
    }

    // Reformata o valor numérico atual (vindo das props) para exibição
    // Isso garante que a exibição reflita o valor numérico correto após qualquer conversão
    const displayValue = value !== undefined ? formatForDisplay(value) : "";
    frontendLog.debug(`FormattedKwhInput: Formatando valor no blur para exibição: ${displayValue}`);
    setRawInputValue(displayValue);

    // NÃO PRECISAMOS MAIS PARSEAR/CONVERTER AQUI, pois handleInputChange já fez isso
    // let numericValue = parseFloat(rawInputValue.replace(",", "."));
    // if (!isNaN(numericValue)) {
    //   if (numericValue >= 10 && rawInputValue.indexOf('.') === -1 && rawInputValue.indexOf(',') === -1) {
    //     numericValue = numericValue / 1000;
    //     onChange(numericValue);
    //   }
    //   const formattedValue = formatForDisplay(numericValue);
    //   setRawInputValue(formattedValue);
    //   frontendLog.debug(`FormattedKwhInput: valor formatado no blur para ${formattedValue} (original: ${numericValue})`);
    // }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={rawInputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground pointer-events-none">
        R$/kWh
      </div>
    </div>
  );
} 