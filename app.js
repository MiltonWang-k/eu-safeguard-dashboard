const CSV_FILE = "safeguard_quota_dashboard_upload.csv";
let data = [];

const $ = (id) => document.getElementById(id);

const formatNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell);

      if (row.length > 1) rows.push(row);

      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...records] = rows;

  return records.map((record) => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = record[index] || "";
    });

    return item;
  });
}

function number(value) {
  return Number(value) || 0;
}

function trackable(row) {
  return String(row.live_tracking_eligible).toLowerCase() === "true";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
}

function quarterNumber(period) {
  const [year, quarter] = period.split("-Q");
  return Number(year) * 4 + Number(quarter);
}

function defaultPeriods() {
  const today = new Date();
  const year = today.getFullYear();
  const quarter = Math.floor(today.getMonth() / 3) + 1;

  const current = `${year}-Q${quarter}`;

  const next =
    quarter === 4
      ? `${year + 1}-Q1`
      : `${year}-Q${quarter + 1}`;

  return [current, next];
}

function fillSelect(id, values, placeholder, labels = {}) {
  const select = $(id);

  select.innerHTML = "";
  select.add(new Option(placeholder, ""));

  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach((value) => {
      select.add(new Option(labels[value] || value, value));
    });
}

function yoy(row) {
  const [year, quarter] = row.period.split("-Q");
  const previousPeriod = `${Number(year) - 1}-Q${quarter}`;

  const previous = data.find((item) =>
    trackable(item) &&
    item.product_no === row.product_no &&
    item.country_or_quota_group === row.country_or_quota_group &&
    item.period === previousPeriod
  );

  if (!previous || number(previous.quota_tonnes) === 0) {
    return {
      value: null,
      label: "New / no comparable prior-year quota",
      style: "neutral"
    };
  }

  const value =
    ((number(row.quota_tonnes) - number(previous.quota_tonnes)) /
      number(previous.quota_tonnes)) * 100;

  return {
    value,
    label: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    style: value < 0 ? "down" : "up"
  };
}

function render() {
  const product = $("product").value;
  const period = $("period").value;
  const origin = $("origin").value;
  const sort = $("sort").value;

  let results = data.filter(trackable);

  if (product) {
    results = results.filter((row) => row.product_no === product);
  }

  if (period) {
    results = results.filter((row) => row.period === period);
  }

  if (origin) {
    results = results.filter(
      (row) => row.country_or_quota_group === origin
    );
  }

  if (!period) {
    const wanted = defaultPeriods();

    const available = [...new Set(results.map((row) => row.period))];

    const usable = wanted.filter((item) => available.includes(item));

    const fallback = available
      .sort((a, b) => quarterNumber(a) - quarterNumber(b))
      .slice(-2);

    const periodsToShow = usable.length ? usable : fallback;

    results = results.filter((row) =>
      periodsToShow.includes(row.period)
    );
  }

  results = results.map((row) => ({
    ...row,
    yoyResult: yoy(row)
  }));

  results.sort((a, b) => {
    if (sort === "quota_desc") {
      return number(b.quota_tonnes) - number(a.quota_tonnes);
    }

    if (sort === "quota_asc") {
      return number(a.quota_tonnes) - number(b.quota_tonnes);
    }

    if (sort === "yoy_desc") {
      return (b.yoyResult.value ?? -Infinity) -
             (a.yoyResult.value ?? -Infinity);
    }

    if (sort === "yoy_asc") {
      return (a.yoyResult.value ?? Infinity) -
             (b.yoyResult.value ?? Infinity);
    }

    return 0;
  });

  $("count").textContent = results.length;

  $("tonnes").textContent = formatNumber.format(
    results.reduce(
      (total, row) => total + number(row.quota_tonnes),
      0
    )
  );

  $("origins").textContent = new Set(
    results.map((row) => row.country_or_quota_group)
  ).size;

  $("status").textContent = results.length
    ? `Showing ${results.length} quota record(s).`
    : "No matching quota records.";

  $("rows").innerHTML = results.length
    ? results.map((row) => `
      <tr>
        <td>${escapeHtml(row.period)}</td>

        <td>
          <b>${escapeHtml(row.product_no)}</b>
        </td>

        <td>${escapeHtml(row.country_or_quota_group)}</td>

        <td>
          <span class="badge">
            ${escapeHtml(row.display_quota_type)}
          </span>
        </td>

        <td class="num">
          ${formatNumber.format(number(row.quota_tonnes))}
        </td>

        <td>
          <span class="yoy ${row.yoyResult.style}">
            ${escapeHtml(row.yoyResult.label)}
          </span>
        </td>

        <td>${escapeHtml(row.quota_order_no_display)}</td>

        <td class="num">
          ${formatNumber.format(number(row.duty_rate_pct))}%
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="8">No matching quota records.</td>
      </tr>
    `;
}

fetch(CSV_FILE)
  .then((response) => response.text())
  .then((csvText) => {
    data = parseCSV(csvText);

    const productLabels = {};

    data.forEach((row) => {
      productLabels[row.product_no] =
        `${row.product_no} — ${row.product_category}`;
    });

    fillSelect(
      "product",
      data.map((row) => row.product_no),
      "All product categories",
      productLabels
    );

    fillSelect(
      "period",
      data.map((row) => row.period),
      "Current + next quarter"
    );

    fillSelect(
      "origin",
      data
        .filter(trackable)
        .map((row) => row.country_or_quota_group),
      "All countries / quota pools"
    );

    $("updated").textContent = `Data records: ${data.length}`;

    ["product", "period", "origin", "sort"].forEach((id) => {
      $(id).addEventListener("change", render);
    });

    $("reset").addEventListener("click", () => {
      $("product").value = "";
      $("period").value = "";
      $("origin").value = "";
      $("sort").value = "quota_desc";

      render();
    });

    render();
  })
  .catch(() => {
    $("status").textContent =
      "Data load failed. Confirm that the CSV is in the repository root.";
  });
