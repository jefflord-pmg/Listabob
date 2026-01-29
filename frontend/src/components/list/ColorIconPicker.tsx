interface ColorIconPickerProps {
  selectedColor: string | null;
  selectedIcon: string | null;
  onColorChange: (color: string | null) => void;
  onIconChange: (icon: string | null) => void;
}

const COLORS = [
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#ca8a04', // yellow-600
  '#16a34a', // green-600
  '#0d9488', // teal-600
  '#0891b2', // cyan-600
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#9333ea', // purple-600
  '#c026d3', // fuchsia-600
  '#db2777', // pink-600
  '#64748b', // slate-500
];

const ICONS = [
  '📋', '📝', '📊', '📈', '📅', '📆',
  '🎯', '✅', '⭐', '💡', '🔔', '📌',
  '🏠', '💼', '🛒', '🎬', '🎵', '📚',
  '🍽️', '✈️', '🏃', '💪', '🎮', '🧪',
  '💰', '🎁', '❤️', '🌟', '🚀', '🔧',
  '📺', '🖥️', '📱', '🎧', '📷', '🎨',
];

export function ColorIconPicker({
  selectedColor,
  selectedIcon,
  onColorChange,
  onIconChange,
}: ColorIconPickerProps) {
  return (
    <div className="space-y-4">
      {/* Color Picker */}
      <div>
        <label className="label">
          <span className="label-text">Choose a color</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-md transition-all ${
                selectedColor === color 
                  ? 'ring-2 ring-offset-2 ring-base-content scale-110' 
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(selectedColor === color ? null : color)}
              aria-label={`Select color ${color}`}
            >
              {selectedColor === color && (
                <svg className="w-full h-full text-white p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Picker */}
      <div>
        <label className="label">
          <span className="label-text">Choose an icon</span>
        </label>
        <div className="flex flex-wrap gap-1">
          {ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              className={`w-10 h-10 text-xl rounded-md transition-all flex items-center justify-center ${
                selectedIcon === icon
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'hover:bg-base-200'
              }`}
              onClick={() => onIconChange(selectedIcon === icon ? null : icon)}
              aria-label={`Select icon ${icon}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { COLORS, ICONS };
