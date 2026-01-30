import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Category } from '../types';

interface CategorySelectorProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CategorySelector({
  categories,
  value,
  onChange,
  placeholder = 'Seleccionar categoría...',
  required = false
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Encontrar la categoría seleccionada
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === value);
  }, [categories, value]);

  // Organizar categorías por grupos
  const { groupedCategories } = useMemo(() => {
    const groups = categories.filter(c => c.isGroup === true);
    const regularCategories = categories.filter(c => c.isGroup === false || c.isGroup === undefined);

    const grouped: { group: { id: string; name: string } | null; items: Category[] }[] = [];

    // Categorías agrupadas por su parent
    groups.forEach(group => {
      const groupItems = regularCategories.filter(c => c.parentId === group.id);
      if (groupItems.length > 0) {
        grouped.push({ group: { id: group.id, name: group.name }, items: groupItems });
      }
    });

    // Categorías sin grupo (huérfanas)
    const orphanCategories = regularCategories.filter(c => !c.parentId);
    if (orphanCategories.length > 0) {
      grouped.push({ group: null, items: orphanCategories });
    }

    return { groupedCategories: grouped };
  }, [categories]);

  // Filtrar categorías por búsqueda
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedCategories;

    const term = searchTerm.toLowerCase().trim();

    return groupedCategories
      .map(group => ({
        ...group,
        items: group.items.filter(c =>
          c.name.toLowerCase().includes(term) ||
          (group.group?.name.toLowerCase().includes(term))
        )
      }))
      .filter(group => group.items.length > 0);
  }, [groupedCategories, searchTerm]);

  // Focus en el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const totalCategories = categories.filter(c => !c.isGroup).length;

  return (
    <div ref={containerRef} className="relative">
      {/* Botón trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all",
          selectedCategory ? "text-gray-900 font-medium" : "text-gray-500"
        )}
      >
        <span className="truncate">
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Input hidden para validación de formulario */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Buscador */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 ml-1">
              {searchTerm
                ? `${filteredGroups.reduce((acc, g) => acc + g.items.length, 0)} resultados`
                : `${totalCategories} categorías disponibles`
              }
            </p>
          </div>

          {/* Lista de categorías */}
          <div className="max-h-64 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="py-8 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No se encontraron categorías</p>
                <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
              </div>
            ) : (
              filteredGroups.map((group, index) => (
                <div key={group.group?.id || `orphan-${index}`}>
                  {/* Header del grupo */}
                  <div className={cn(
                    "px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2",
                    index > 0 && "border-t"
                  )}>
                    <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {group.group?.name || 'Sin grupo'}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Categorías del grupo */}
                  {group.items.map((category) => {
                    const isSelected = category.id === value;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleSelect(category.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <span className={cn(
                          "text-sm",
                          isSelected ? "font-semibold" : "font-medium"
                        )}>
                          {category.name}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer con acción de cerrar */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
