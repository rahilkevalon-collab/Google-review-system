import React from 'react';
import { 
  Code, 
  ShoppingBag, 
  Utensils, 
  Stethoscope, 
  Building2, 
  GraduationCap, 
  Compass, 
  Sparkles, 
  TrendingUp, 
  Store, 
  Layers 
} from 'lucide-react';

const ICON_MAP = {
  'IT Services and Software Development': Code,
  'E-commerce': ShoppingBag,
  'Restaurants and Food': Utensils,
  'Healthcare': Stethoscope,
  'Real Estate': Building2,
  'Education': GraduationCap,
  'Travel and Hospitality': Compass,
  'Beauty and Salon': Sparkles,
  'Digital Marketing': TrendingUp,
  'Retail': Store,
  'Other': Layers
};

export default function CategorySelector({ categories = [], selectedCategory, onSelectCategory }) {
  const sortedCategories = [...categories].sort((a, b) => {
    const aIsOther = (a.name || '').trim().toLowerCase() === 'other';
    const bIsOther = (b.name || '').trim().toLowerCase() === 'other';
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    return 0;
  });

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {sortedCategories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const IconComp = ICON_MAP[cat.name] || Layers;

          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02] ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 shadow-2xs'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <IconComp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold leading-tight line-clamp-2">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
