import { cn } from '../lib/utils';

interface AmountInputProps {
  /** Valor crudo en pesos, solo dígitos (ej: "385000") */
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  'aria-label'?: string;
}

function formatThousands(raw: string): string {
  if (!raw) return '';
  const n = Number(raw);
  if (isNaN(n)) return '';
  return n.toLocaleString('es-CO');
}

/**
 * Campo de monto en COP: teclado numérico en móvil y separador de miles en
 * vivo, para que "3850000" se lea "3.850.000" y no se cuele un cero de más.
 * Al enfocarse hace scroll para que el teclado no lo tape.
 */
export default function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className,
  autoFocus,
  required,
  disabled,
  readOnly,
  'aria-label': ariaLabel,
}: AmountInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      value={formatThousands(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
      onFocus={(e) => {
        const el = e.target;
        // Espera a que el teclado se despliegue antes de reubicar el campo
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
      }}
      placeholder={placeholder}
      className={cn('tabular-nums', className)}
      autoFocus={autoFocus}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
