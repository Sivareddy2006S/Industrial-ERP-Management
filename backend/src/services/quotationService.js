const { Decimal } = require('decimal.js');

/**
 * Calculate quotation totals from items on the BACKEND.
 * Uses Decimal.js for precision (avoids JavaScript floating-point issues).
 *
 * For each item:
 *   Base Amount = quantity × unitPrice
 *   Discount Amount = Base Amount × (discountPercent / 100)
 *   Taxable Amount = Base Amount - Discount Amount
 *   GST Amount = Taxable Amount × (gstPercent / 100)
 *   Line Amount = Taxable Amount + GST Amount
 *
 * @param {Array} items - Array of { quantity, unitPrice, discountPercent, gstPercent }
 * @returns {{ items, subtotal, discountAmount, gstAmount, grandTotal }}
 */
function calculateQuotationTotals(items) {
  let subtotal = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let totalGst = new Decimal(0);

  const calculatedItems = items.map((item) => {
    const qty = new Decimal(item.quantity);
    const price = new Decimal(item.unitPrice);
    const discPct = new Decimal(item.discountPercent || 0);
    const gstPct = new Decimal(item.gstPercent || 18);

    const baseAmount = qty.mul(price);
    const discountAmt = baseAmount.mul(discPct).div(100);
    const taxableAmount = baseAmount.minus(discountAmt);
    const gstAmt = taxableAmount.mul(gstPct).div(100);
    const lineAmount = taxableAmount.plus(gstAmt);

    subtotal = subtotal.plus(baseAmount);
    totalDiscount = totalDiscount.plus(discountAmt);
    totalGst = totalGst.plus(gstAmt);

    return {
      ...item,
      lineAmount: lineAmount.toDecimalPlaces(2).toNumber(),
    };
  });

  return {
    items: calculatedItems,
    subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    discountAmount: totalDiscount.toDecimalPlaces(2).toNumber(),
    gstAmount: totalGst.toDecimalPlaces(2).toNumber(),
    grandTotal: subtotal
      .minus(totalDiscount)
      .plus(totalGst)
      .toDecimalPlaces(2)
      .toNumber(),
  };
}

module.exports = { calculateQuotationTotals };
