const prisma = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Generate next sequential number with a prefix.
 * @param {string} prefix - e.g., 'ENQ', 'QTN', 'SO', 'DSP'
 * @param {string} model - Prisma model name
 * @param {string} field - Field name for the number
 */
async function generateNumber(prefix, model, field) {
  const last = await prisma[model].findFirst({
    orderBy: { id: 'desc' },
    select: { [field]: true },
  });

  let nextNum = 1;
  if (last && last[field]) {
    const match = last[field].match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

module.exports = { generateNumber };
