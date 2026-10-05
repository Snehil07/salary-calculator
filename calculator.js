(() => {
  "use strict";

  const STANDARD_DEDUCTION = 75000;
  const PF_EXEMPT_LIMIT = 750000;
  const REBATE_LIMIT = 1200000;
  const TAX_SLABS = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: 1200000, rate: 0.10 },
    { limit: 1600000, rate: 0.15 },
    { limit: 2000000, rate: 0.20 },
    { limit: 2400000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ];

  function taxFromSlabs(taxableIncome) {
    let tax = 0;
    let previousLimit = 0;

    for (const slab of TAX_SLABS) {
      tax += Math.max(0, Math.min(taxableIncome, slab.limit) - previousLimit) * slab.rate;
      if (taxableIncome <= slab.limit) break;
      previousLimit = slab.limit;
    }
    return tax;
  }

  function calculateIncomeTax(taxableIncome) {
    const taxBeforeRebate = taxFromSlabs(taxableIncome);
    const rebateRelief = taxableIncome > REBATE_LIMIT
      ? Math.max(0, taxBeforeRebate - (taxableIncome - REBATE_LIMIT))
      : taxBeforeRebate;
    const baseTax = taxBeforeRebate - rebateRelief;
    let surchargeRate = 0;
    let threshold = 0;

    if (taxableIncome > 20000000) {
      surchargeRate = 0.25;
      threshold = 20000000;
    } else if (taxableIncome > 10000000) {
      surchargeRate = 0.15;
      threshold = 10000000;
    } else if (taxableIncome > 5000000) {
      surchargeRate = 0.10;
      threshold = 5000000;
    }

    let surcharge = baseTax * surchargeRate;
    let marginalRelief = 0;
    if (threshold > 0) {
      const priorSurchargeRate = threshold >= 20000000 ? 0.15 : threshold >= 10000000 ? 0.10 : 0;
      const taxAtThreshold = taxFromSlabs(threshold) * (1 + priorSurchargeRate);
      const maximumTaxWithMarginalRelief = taxAtThreshold + taxableIncome - threshold;
      const taxWithSurcharge = baseTax + surcharge;
      if (taxWithSurcharge > maximumTaxWithMarginalRelief) {
        marginalRelief = taxWithSurcharge - maximumTaxWithMarginalRelief;
        surcharge = Math.max(0, surcharge - marginalRelief);
      }
    }

    const cess = (baseTax + surcharge) * 0.04;
    return {
      baseTax,
      surcharge,
      surchargeRate,
      cess,
      totalTax: baseTax + surcharge + cess,
      marginalRelief,
      rebateRelief,
      rebated: taxableIncome <= REBATE_LIMIT,
    };
  }

  function calculateSalary({ annualBaseSalary, pfType, annualProfessionalTax = 0 }) {
    if (!Number.isFinite(annualBaseSalary) || annualBaseSalary < 0) {
      throw new RangeError("Annual base salary must be a finite, non-negative number.");
    }
    if (!Number.isFinite(annualProfessionalTax) || annualProfessionalTax < 0) {
      throw new RangeError("Annual professional tax must be a finite, non-negative number.");
    }
    if (pfType !== "capped" && pfType !== "actual") {
      throw new TypeError("PF type must be either 'capped' or 'actual'.");
    }

    const monthlyBase = annualBaseSalary / 12;
    let monthlyBasic;
    let monthlyEmployerPF;
    if (pfType === "capped") {
      monthlyEmployerPF = 3000;
      monthlyBasic = (monthlyBase - monthlyEmployerPF) * 0.5;
    } else {
      monthlyBasic = monthlyBase * 0.5;
      monthlyEmployerPF = monthlyBasic * 0.12;
    }

    const monthlyEmployeePF = monthlyEmployerPF;
    const annualEmployeePF = monthlyEmployeePF * 12;
    const annualEmployerPF = monthlyEmployerPF * 12;
    const taxableEmployerPF = Math.max(0, annualEmployerPF - PF_EXEMPT_LIMIT);
    const taxableGrossIncome = annualBaseSalary - annualEmployerPF + taxableEmployerPF;
    const taxableIncome = Math.max(0, taxableGrossIncome - STANDARD_DEDUCTION);
    const tax = calculateIncomeTax(taxableIncome);
    const annualTakeHome = annualBaseSalary
      - annualEmployerPF
      - annualEmployeePF
      - tax.totalTax
      - annualProfessionalTax;

    return {
      monthlyBasic,
      monthlyEmployeePF,
      monthlyEmployerPF,
      annualEmployeePF,
      annualEmployerPF,
      annualProfessionalTax,
      monthlyProfessionalTax: annualProfessionalTax / 12,
      taxableEmployerPF,
      taxableGrossIncome,
      taxableIncome,
      tax,
      annualTakeHome,
      monthlyTakeHome: annualTakeHome / 12,
      effectiveTaxRate: annualBaseSalary > 0 ? tax.totalTax / annualBaseSalary * 100 : 0,
    };
  }

  window.SalaryCalculator = Object.freeze({ calculateSalary });
})();
