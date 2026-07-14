const CSV_FILE = "safeguard_quota_dashboard_upload.csv";

let allData = [];

const $ = (id) => document.getElementById(id);

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    const nextCharacter = text[i + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      cell += '"';
      i++;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if (
      (character === "\n" || character === "\r") &&
      !inQuotes
    ) {
      if (character === "\r" && nextCharacter === "\n") {
        i++;
      }

      row.push(cell);

      if (row.length > 1) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;

  return dataRows.map((dataRow) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = dataRow[index] ?? "";
    });

    return item;
  });
}

function isTrackable(row) {
  return String(row.live_tracking_eligible).toLowerCase() === "true";
}

function toNumber(value) {
  return Number(value) || 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };

    return map[character];
  });
}

function quarterIndex(period) {
  const [year, quarter] = period.split("-Q");

  return Number(year) * 4 + Number(quarter) - 1;
}

function currentAndNextQuarters() {
  const today = new Date();
  const year = today.getFullYear();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;

  const current = `${year}-Q${currentQuarter}`;

  const next =
    currentQuarter === 4
      ? `${year + 1}-Q1`
      : `${year}-Q${currentQuarter + 1}`;

  return [current, next];
}

function fillSelect(selectId, values, placeholder) {
  const select = $(selectId);
  const selectedValue = select.value;

  select.innerHTML = "";
  select.add(new Option(placeholder, ""));

  const uniqueValues = [...new Set(values.filter(Boolean))];

  uniqueValues
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach((value) => {
      select.add(new Option(value, value));
    });

  const valueStillExists = [...select.options].some(
    (option) => option.value === selectedValue
  );

  select.value = valueStillExists ? selectedValue : "";
}

function calculateYoYChange(row) {
  const [year, quarter] = row.period.split("-Q");
  const previousYearPeriod = `${Number(year) - 1}-Q${quarter}`;

  const previousYearRow = allData.find((item) => {
    return (
      isTrackable(item) &&
      item.product_no === row.product_no &&
      item.country_or_quota_group === row.country_or_quota_group &&
      item.period === previousYearPeriod
    );
  });

  if (!previousYearRow || toNumber(previousYearRow.quota_tonnes) === 0) {
    return {
      label: "New / no comparable prior-year quota",
      cssClass: "neutral"
    };
  }

  const change =
    ((toNumber(row.quota_tonnes) -
      toNumber(previousYearRow.quota_tonnes)) /
      toNumber(previousYearRow.quota_tonnes)) *
    100;

  return {
    label: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
    cssClass: change < 0 ? "down" : "up"
  };
}

function renderDashboard() {
  const selectedProduct = $("product").value;
  const selectedPeriod = $("period").value;
  const selectedOrigin = $("origin").value;

  let results = allData.filter(isTrackable);

  if (selectedProduct) {
    results = results.filter(
      (row) => row.product_no === selectedProduct
    );
  }

  if (selectedOrigin) {
    results = results.filter(
      (row) => row.country_or_quota_group === selectedOrigin
    );
  }

  if (selectedPeriod) {
    results = results.filter(
      (row) => row.period === selectedPeriod
    );
  } else {
    const preferredPeriods = currentAndNextQuarters();

    const availablePeriods = [...new Set(
      results.map((row) => row.period)
    )];

    const availablePreferredPeriods = preferredPeriods.filter(
      (period) => availablePeriods.includes(period)
    );

    const fallbackPeriods = availablePeriods
      .sort((a, b) => quarterIndex(a) - quarterIndex(b))
      .slice(-2);

    const periodsToShow =
      availablePreferredPeriods.length > 0
        ? availablePreferredPeriods
        : fallbackPeriods;

    results = results.filter((row) =>
      periodsToShow.includes(row.period)
    );
  }

  results.sort((a, b) => {
    return (
      quarterIndex(a.period) - quarterIndex(b.period) ||
      a.product_no.localeCompare(
        b.product_no,
        undefined,
        { numeric: true }
      ) ||
      toNumber(b.quota_tonnes) - toNumber(a.quota_tonnes)
    );
  });

  $("count").textContent = results.length;

  $("tonnes").textContent = numberFormat.format(
    results.reduce(
      (total, row) => total + toNumber(row.quota_tonnes),
      0
    )
  );

  $("origins").textContent = new Set(
    results.map((row) => row.country_or_quota_group)
  ).size;

  $("status").textContent = results.length
    ? `Showing ${results.length} quota record${
        results.length === 1 ? "" : "s"
      }.`
    : "No matching quota records.";

  $("rows").innerHTML = results.length
    ? results.map((row) => {
        const yoy = calculateYoYChange(row);

        return `
          <tr>
            <td>${escapeHtml(row.period)}</td>
            <td>
              <b>${escapeHtml(row.product_no)}</b><br>
              <small>${escapeHtml(row.product_category)}</small>
            </td>
            <td>${escapeHtml(row.country_or_quota_group)}</td>
            <td>
              <span class="badge">
                ${escapeHtml(row.display_quota_type)}
              </span>
            </td>
            <td class="num">
              ${numberFormat.format(toNumber(row.quota_tonnes))}
            </td>
            <td>
              <span class="yoy ${yoy.cssClass}">
                ${escapeHtml(yoy.label)}
              </span>
            </td>
            <td>${escapeHtml(row.quota_order_no_display)}</td>
            <td class="num">
              ${numberFormat.format(
                toNumber(row.duty_rate_pct)
              )}%
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="8">No matching quota records.</td>
      </tr>
    `;
}

fetch(CSV_FILE)
  .then((response) => response.text())
  .then((csvText) => {
    allData = parseCSV(csvText);

    fillSelect(
      "product",
      allData.map((row) => row.product_no),
      "All product categories"
    );

    fillSelect(
      "period",
      allData.map((row) => row.period),
      "Current + next quarter"
    );

    fillSelect(
      "origin",
      allData
        .filter(isTrackable)
        .map((row) => row.country_or_quota_group),
      "All countries / quota pools"
    );

    $("updated").textContent = `Data records: ${allData.length}`;

    $("product").addEventListener("change", renderDashboard);
    $("period").addEventListener("change", renderDashboard);
    $("origin").addEventListener("change", renderDashboard);

    $("reset").addEventListener("click", () => {
      $("product").value = "";
      $("period").value = "";
      $("origin").value = "";

      renderDashboard();
    });

    renderDashboard();
  })
  .catch(() => {
    $("status").textContent =
      "Data load failed. Confirm that the CSV file is in the same folder as index.html.";
  });