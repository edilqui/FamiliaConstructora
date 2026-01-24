import { useState } from 'react';
import { X, Delete, Calculator as CalcIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface CalculatorProps {
  onClose: () => void;
  onConfirm: (value: string) => void;
  initialValue?: string;
}

export default function Calculator({ onClose, onConfirm, initialValue = '' }: CalculatorProps) {
  const [display, setDisplay] = useState(initialValue || '0');
  const [previousValue, setPreviousValue] = useState('');
  const [operation, setOperation] = useState<string | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);

  const handleNumber = (num: string) => {
    if (shouldResetDisplay) {
      setDisplay(num);
      setShouldResetDisplay(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (shouldResetDisplay) {
      setDisplay('0.');
      setShouldResetDisplay(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op: string) => {
    if (operation && !shouldResetDisplay) {
      calculate();
    }
    setPreviousValue(display);
    setOperation(op);
    setShouldResetDisplay(true);
  };

  const calculate = () => {
    const prev = parseFloat(previousValue);
    const current = parseFloat(display);

    if (isNaN(prev) || isNaN(current)) return;

    let result = 0;
    switch (operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '×':
        result = prev * current;
        break;
      case '÷':
        result = current !== 0 ? prev / current : 0;
        break;
      default:
        return;
    }

    setDisplay(result.toString());
    setOperation(null);
    setPreviousValue('');
    setShouldResetDisplay(true);
  };

  const handleEquals = () => {
    if (operation) {
      calculate();
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue('');
    setOperation(null);
    setShouldResetDisplay(false);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleConfirm = () => {
    const value = parseFloat(display);
    if (!isNaN(value) && value >= 0) {
      onConfirm(value.toFixed(2));
    }
  };

  const Button = ({ children, onClick, className = '', variant = 'default' }: any) => (
    <button
      onClick={onClick}
      className={cn(
        'h-16 rounded-xl font-bold text-lg transition-all active:scale-95',
        variant === 'number' && 'bg-gray-100 hover:bg-gray-200 text-gray-900',
        variant === 'operation' && 'bg-blue-500 hover:bg-blue-600 text-white',
        variant === 'equals' && 'bg-emerald-500 hover:bg-emerald-600 text-white',
        variant === 'clear' && 'bg-red-500 hover:bg-red-600 text-white',
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      {/* Calculator */}
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 p-6 mb-2">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalcIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Calculadora</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4">
          <div className="text-right">
            {operation && (
              <div className="text-gray-400 text-sm mb-1">
                {previousValue} {operation}
              </div>
            )}
            <div className="text-white text-4xl font-bold truncate">
              {display}
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Row 1 */}
          <Button onClick={handleClear} variant="clear" className="col-span-2">
            C
          </Button>
          <Button onClick={handleDelete} variant="operation">
            <Delete className="w-5 h-5 mx-auto" />
          </Button>
          <Button onClick={() => handleOperation('÷')} variant="operation">
            ÷
          </Button>

          {/* Row 2 */}
          <Button onClick={() => handleNumber('7')} variant="number">7</Button>
          <Button onClick={() => handleNumber('8')} variant="number">8</Button>
          <Button onClick={() => handleNumber('9')} variant="number">9</Button>
          <Button onClick={() => handleOperation('×')} variant="operation">×</Button>

          {/* Row 3 */}
          <Button onClick={() => handleNumber('4')} variant="number">4</Button>
          <Button onClick={() => handleNumber('5')} variant="number">5</Button>
          <Button onClick={() => handleNumber('6')} variant="number">6</Button>
          <Button onClick={() => handleOperation('-')} variant="operation">-</Button>

          {/* Row 4 */}
          <Button onClick={() => handleNumber('1')} variant="number">1</Button>
          <Button onClick={() => handleNumber('2')} variant="number">2</Button>
          <Button onClick={() => handleNumber('3')} variant="number">3</Button>
          <Button onClick={() => handleOperation('+')} variant="operation">+</Button>

          {/* Row 5 */}
          <Button onClick={() => handleNumber('0')} variant="number" className="col-span-2">
            0
          </Button>
          <Button onClick={handleDecimal} variant="number">.</Button>
          <Button onClick={handleEquals} variant="equals">=</Button>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Usar este valor
        </button>
      </div>
    </div>
  );
}
