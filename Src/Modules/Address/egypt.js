export const egyptGovernorates = ['Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr El Sheikh', 'Luxor', 'Matrouh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez'];
export function normalizeEgyptPhone(value, helpers) {
  const phone = value.replace(/[\s()-]/g, '').replace(/^\+20/, '0').replace(/^0020/, '0');
  return /^01[0125][0-9]{8}$/.test(phone) ? phone : helpers.message('Enter a valid Egyptian mobile number');
}
