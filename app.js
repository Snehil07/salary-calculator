(() => {
  "use strict";

  const salaryInput = document.getElementById("salary");
  const pfTypeInput = document.getElementById("pf-type");
  const professionalTaxInput = document.getElementById("professional-tax");
  const salaryError = document.getElementById("salary-error");
  const professionalTaxError = document.getElementById("professional-tax-error");
  const pfHelp = document.getElementById("pf-help");
  const formatRupees = (amount) => Math.round(amount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  function renderTakeHome(result) {
    document.getElementById("monthly-take-home").textContent = formatRupees(result.monthlyTakeHome);
    document.getElementById("annual-take-home").textContent = formatRupees(result.annualTakeHome);
    document.getElementById("effective-rate").textContent = `${result.effectiveTaxRate.toFixed(1)}%`;
  }

  function renderMonthlyBreakdown(result) {
    document.getElementById("monthly-employee-pf").textContent = formatRupees(result.monthlyEmployeePF);
    document.getElementById("monthly-employer-pf").textContent = formatRupees(result.monthlyEmployerPF);
    document.getElementById("monthly-tax").textContent = formatRupees(result.tax.totalTax / 12);
    document.getElementById("monthly-professional-tax").textContent = formatRupees(result.monthlyProfessionalTax);
    document.getElementById("monthly-net").textContent = formatRupees(result.monthlyTakeHome);
  }

  function renderAnnualTaxInsights(result) {
    const { tax } = result;
    document.getElementById("annual-tax-total").textContent = formatRupees(tax.totalTax);
    document.getElementById("annual-base-tax").textContent = formatRupees(tax.baseTax);
    document.getElementById("annual-surcharge").textContent = formatRupees(tax.surcharge);
    document.getElementById("annual-cess").textContent = formatRupees(tax.cess);
    document.getElementById("surcharge-rate").textContent = tax.surchargeRate ? `(${tax.surchargeRate * 100}%)` : "";
    document.getElementById("rebate-note").textContent = tax.rebateRelief > 0
      ? `${tax.rebated ? "Section 87A rebate" : "Section 87A marginal relief"}: ${formatRupees(tax.rebateRelief)}`
      : `Taxable income: ${formatRupees(result.taxableIncome)}`;
    document.getElementById("marginal-relief-note").textContent = tax.marginalRelief > 0
      ? `Marginal relief: ${formatRupees(tax.marginalRelief)}`
      : "Marginal relief: not applicable";

    const pfAlert = document.getElementById("pf-alert");
    if (result.taxableEmployerPF > 0) {
      document.getElementById("pf-alert-copy").textContent =
        `Employer PF of ${formatRupees(result.annualEmployerPF)} is above the tax-free threshold of ${formatRupees(750000)}. The excess ${formatRupees(result.taxableEmployerPF)} has been added back to taxable income.`;
      pfAlert.classList.remove("hidden");
    } else {
      pfAlert.classList.add("hidden");
    }
  }

  function render() {
    const salary = Number(salaryInput.value);
    if (!Number.isFinite(salary) || salary < 0 || salaryInput.value.trim() === "") {
      salaryError.textContent = "Enter a valid, non-negative annual salary.";
      salaryError.classList.remove("hidden");
      salaryInput.setAttribute("aria-invalid", "true");
      return;
    }

    const annualProfessionalTax = Number(professionalTaxInput.value);
    if (!Number.isFinite(annualProfessionalTax) || annualProfessionalTax < 0 || professionalTaxInput.value.trim() === "") {
      professionalTaxError.textContent = "Enter a valid, non-negative annual professional tax.";
      professionalTaxError.classList.remove("hidden");
      professionalTaxInput.setAttribute("aria-invalid", "true");
      return;
    }

    salaryError.classList.add("hidden");
    salaryInput.removeAttribute("aria-invalid");
    professionalTaxError.classList.add("hidden");
    professionalTaxInput.removeAttribute("aria-invalid");
    const result = window.SalaryCalculator.calculateSalary({
      annualBaseSalary: salary,
      pfType: pfTypeInput.value,
      annualProfessionalTax,
    });
    renderTakeHome(result);
    renderMonthlyBreakdown(result);
    renderAnnualTaxInsights(result);
  }

  salaryInput.addEventListener("input", render);
  professionalTaxInput.addEventListener("input", render);
  pfTypeInput.addEventListener("change", () => {
    pfHelp.textContent = pfTypeInput.value === "capped"
      ? "12% of the ₹25,000 monthly wage ceiling."
      : "12% of basic salary, assumed at 50% of monthly base.";
    render();
  });
  document.getElementById("calculator-form").addEventListener("submit", (event) => event.preventDefault());

  const detailTabs = [
    { button: document.getElementById("monthly-tab"), panel: document.getElementById("monthly-panel") },
    { button: document.getElementById("annual-tab"), panel: document.getElementById("annual-panel") },
  ];
  const compactLayout = window.matchMedia("(max-width: 1023px)");
  let activeDetail = 0;

  function updateDetailTabs() {
    detailTabs.forEach(({ button, panel }, index) => {
      const isActive = index === activeDetail;
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      button.classList.toggle("bg-white", isActive);
      button.classList.toggle("text-slate-800", isActive);
      button.classList.toggle("font-bold", isActive);
      button.classList.toggle("shadow-sm", isActive);
      button.classList.toggle("text-slate-500", !isActive);
      button.classList.toggle("font-semibold", !isActive);
      panel.classList.toggle("hidden", compactLayout.matches && !isActive);
    });
  }

  detailTabs.forEach(({ button }, index) => {
    button.addEventListener("click", () => {
      activeDetail = index;
      updateDetailTabs();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        activeDetail = (index + 1) % detailTabs.length;
        updateDetailTabs();
        detailTabs[activeDetail].button.focus();
      }
    });
  });

  compactLayout.addEventListener("change", updateDetailTabs);
  window.addEventListener("resize", updateDetailTabs);
  updateDetailTabs();
  render();
})();
