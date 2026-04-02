/**
 * Generates initials from a name or username.
 * Takes the first letter of the first two words (if space separated) 
 * or the first two letters of a single word.
 */
export const getInitials = (name: string): string => {
  if (!name) return '??';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return parts[0].slice(0, 2).toUpperCase();
};

/**
 * Generates a consistent background color based on name string
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-stone-100',
    'bg-stone-200',
    'bg-stone-300',
    'bg-blue-100',
    'bg-indigo-100',
    'bg-emerald-100',
    'bg-orange-100',
    'bg-rose-100',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};
