/**
 * Returns Tailwind classes for a seat tile based on its status.
 */
export const getSeatClasses = (status, isClickable = true) => {
  const base = 'rounded-md text-xs font-semibold transition-all duration-150 flex items-center justify-center aspect-square';
  const cursor = isClickable ? 'cursor-pointer' : 'cursor-not-allowed';

  const statusMap = {
    available: 'bg-green-100 hover:bg-green-200 border border-green-300 text-green-800',
    selected:  'bg-blue-500  hover:bg-blue-600  border border-blue-600  text-white scale-105',
    locked:    'bg-yellow-100 border border-yellow-300 text-yellow-700 opacity-80',
    booked:    'bg-red-100   border border-red-300   text-red-700   opacity-60',
  };

  return `${base} ${cursor} ${statusMap[status] || statusMap.available}`;
};

/**
 * Status labels for the seat legend.
 */
export const SEAT_LEGEND = [
  { status: 'available', label: 'Available',  color: 'bg-green-100  border-green-300' },
  { status: 'selected',  label: 'Selected',   color: 'bg-blue-500   border-blue-600' },
  { status: 'locked',    label: 'Locked',     color: 'bg-yellow-100 border-yellow-300' },
  { status: 'booked',    label: 'Booked',     color: 'bg-red-100    border-red-300' },
];
