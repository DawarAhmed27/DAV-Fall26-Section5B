// Lab 10 - Time series visualization of PM2.5 in 2025 (D3 v7)

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDay = d3.timeFormat("%d %b");
const formatFull = d3.timeFormat("%d %b %Y");
const formatMonth = d3.timeFormat("%b");
const formatWeekday = d3.timeFormat("%a");

const width = 900;
const height = 360;
const margin = { top: 30, right: 40, bottom: 45, left: 60 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const WHO_GUIDE = 15;  // WHO 24-hour guideline
const WHO_IT1 = 75;    // WHO interim target 1

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// creates an svg inside the given div and returns the inner group
function makeChart(selector, h) {
  const svg = d3.select(selector).append("svg")
    .attr("width", width)
    .attr("height", h);
  return svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
}

// adds x and y axis titles
function addAxisTitles(g, h, xText, yText) {
  g.append("text").attr("class", "axis-label")
    .attr("x", innerW / 2).attr("y", h + 38)
    .attr("text-anchor", "middle").text(xText);
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2).attr("y", -45)
    .attr("text-anchor", "middle").text(yText);
}

// finds every place where neighbouring dates are more than 1 day apart
function findGaps(data) {
  const gaps = [];
  for (let i = 1; i < data.length; i++) {
    const days = d3.timeDay.count(data[i - 1].date, data[i].date);
    if (days > 1) {
      gaps.push({ before: data[i - 1].date, after: data[i].date, missing: days - 1 });
    }
  }
  return gaps;
}

// load data
d3.csv("dataset/air_quality_2025.csv").then(raw => {
  const data = raw.map(d => ({
    date: parseDate(d.date),
    city: +d.pm25_city,
    suburb: +d.pm25_suburb,
    temp: +d.temp_c
  }));
  data.sort((a, b) => a.date - b.date);

  task1(data);
  task2(data);
  task3(data);
  task4(data);
  task5(data);
  task6(data);
  task7(data);
  task8(data);
  task9(data);
});

// ---------------- Task 1 ----------------
function task1(data) {
  const first = data[0].date;
  const last = data[data.length - 1].date;
  const daysIn2025 = d3.timeDay.count(new Date(2025, 0, 1), new Date(2026, 0, 1));
  const gaps = findGaps(data);
  const missing = d3.sum(gaps, g => g.missing);

  let gapText = "";
  gaps.forEach(g => {
    const firstMissing = d3.timeDay.offset(g.before, 1);
    const lastMissing = d3.timeDay.offset(g.after, -1);
    gapText += `${g.missing} days missing from ${formatFull(firstMissing)} to ${formatFull(lastMissing)}. `;
  });

  d3.select("#task1").html(`
    <p>Number of rows: <b>${data.length}</b></p>
    <p>First date: <b>${formatFull(first)}</b> &nbsp; Last date: <b>${formatFull(last)}</b></p>
    <p>Days in 2025: <b>${daysIn2025}</b></p>
    <p>What I notice: the file covers the full year (1 Jan to 31 Dec) but has only ${data.length} rows
    instead of ${daysIn2025}, so ${missing} days are missing. ${gapText}</p>
  `);
}

// ---------------- Task 2 ----------------
function task2(data) {
  const above15 = data.filter(d => d.city > WHO_GUIDE).length;
  const above75 = data.filter(d => d.city > WHO_IT1).length;
  d3.select("#task2-sub").text(
    `Days above 15 µg/m³: ${above15}   |   Days above 75 µg/m³: ${above75}   (out of ${data.length} recorded days)`
  );

  const g = makeChart("#task2", height);
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.city)]).nice().range([innerH, 0]);

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b")));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Date (2025)", "PM2.5 (µg/m³)");

  const line = d3.line().x(d => x(d.date)).y(d => y(d.city));
  g.append("path").datum(data)
    .attr("fill", "none").attr("stroke", "#c0392b").attr("stroke-width", 1.2)
    .attr("d", line);

  // dashed reference lines
  const refs = [
    { value: WHO_GUIDE, label: "WHO guideline: 15 µg/m³" },
    { value: WHO_IT1, label: "WHO interim target 1: 75 µg/m³" }
  ];
  refs.forEach(r => {
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", y(r.value)).attr("y2", y(r.value))
      .attr("stroke", "#333").attr("stroke-dasharray", "6,4");
    g.append("text").attr("class", "chart-text")
      .attr("x", innerW - 4).attr("y", y(r.value) - 5)
      .attr("text-anchor", "end").text(r.label);
  });

  // two highest days
  const top2 = data.slice().sort((a, b) => b.city - a.city).slice(0, 2);
  g.selectAll(".peak").data(top2).enter().append("circle")
    .attr("cx", d => x(d.date)).attr("cy", d => y(d.city))
    .attr("r", 5).attr("fill", "black");
  g.selectAll(".peak-label").data(top2).enter().append("text")
    .attr("class", "chart-text")
    .attr("x", d => (x(d.date) > innerW / 2 ? x(d.date) - 8 : x(d.date) + 8))
    .attr("y", d => y(d.city) + 4)
    .attr("text-anchor", d => (x(d.date) > innerW / 2 ? "end" : "start"))
    .text(d => `${formatFull(d.date)}: ${d.city} µg/m³`);
}

// ---------------- Task 3 ----------------
function task3(data) {
  const running = d3.cumsum(data, d => (d.city > WHO_IT1 ? 1 : 0));
  const cum = data.map((d, i) => ({ date: d.date, total: running[i] }));
  const finalTotal = cum[cum.length - 1].total;

  d3.select("#task3-sub").text(`Total unhealthy days at year end: ${finalTotal} (same as the Task 2 count of days above 75 µg/m³)`);

  const g = makeChart("#task3", height);
  const x = d3.scaleTime().domain(d3.extent(cum, d => d.date)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, finalTotal]).nice().range([innerH, 0]);

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b")));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Date (2025)", "Running total of days above 75 µg/m³");

  const area = d3.area()
    .x(d => x(d.date))
    .y0(innerH)
    .y1(d => y(d.total));
  g.append("path").datum(cum)
    .attr("fill", "#f4a582").attr("stroke", "#b2182b").attr("stroke-width", 1.5)
    .attr("d", area);

  const lastPoint = cum[cum.length - 1];
  g.append("text").attr("class", "chart-text")
    .attr("x", x(lastPoint.date) - 4).attr("y", y(lastPoint.total) - 6)
    .attr("text-anchor", "end").text(`${finalTotal} days`);
}

// ---------------- Task 4 ----------------
function task4(data) {
  const g = makeChart("#task4", height);
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.city, d.suburb))]).nice()
    .range([innerH, 0]);

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b")));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Date (2025)", "PM2.5 (µg/m³)");

  const series = [
    { key: "city", name: "City centre", color: "#d62728" },
    { key: "suburb", name: "Suburb", color: "#1f77b4" }
  ];

  series.forEach(s => {
    const line = d3.line().x(d => x(d.date)).y(d => y(d[s.key]));
    g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 1.3)
      .attr("d", line);
  });

  // legend
  const legend = g.append("g").attr("transform", "translate(10, 0)");
  series.forEach((s, i) => {
    legend.append("line")
      .attr("x1", 0).attr("x2", 25).attr("y1", i * 20).attr("y2", i * 20)
      .attr("stroke", s.color).attr("stroke-width", 3);
    legend.append("text").attr("class", "chart-text")
      .attr("x", 32).attr("y", i * 20 + 4).text(s.name);
  });
}

// ---------------- Task 5 ----------------
function getLevel(v) {
  if (v <= 35) return "Low";
  if (v <= 75) return "Moderate";
  if (v <= 150) return "High";
  return "Severe";
}

function task5(data) {
  const levels = ["Low", "Moderate", "High", "Severe"];
  const colors = ["#fee5d9", "#fcae91", "#fb6a4a", "#a50f15"]; // light to dark

  const counts = d3.rollup(data, v => v.length, d => formatMonth(d.date), d => getLevel(d.city));

  const monthly = months.map(m => {
    const row = { month: m };
    levels.forEach(l => {
      const monthMap = counts.get(m);
      row[l] = monthMap && monthMap.get(l) ? monthMap.get(l) : 0;
    });
    row.total = d3.sum(levels, l => row[l]);
    return row;
  });

  const stacked = d3.stack().keys(levels)(monthly);

  const g = makeChart("#task5", height);
  const x = d3.scaleBand().domain(months).range([0, innerW - 140]).padding(0.2);
  const y = d3.scaleLinear().domain([0, 31]).range([innerH, 0]);
  const color = d3.scaleOrdinal().domain(levels).range(colors);

  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Month (2025)", "Number of days");

  g.selectAll(".layer").data(stacked).enter().append("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect").data(d => d).enter().append("rect")
    .attr("x", d => x(d.data.month))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("stroke", "#888").attr("stroke-width", 0.5);

  // total days on top of each stack
  g.selectAll(".total").data(monthly).enter().append("text")
    .attr("class", "chart-text")
    .attr("x", d => x(d.month) + x.bandwidth() / 2)
    .attr("y", d => y(d.total) - 4)
    .attr("text-anchor", "middle").text(d => d.total);

  // legend
  const legend = g.append("g").attr("transform", `translate(${innerW - 120}, 10)`);
  levels.slice().reverse().forEach((l, i) => {
    legend.append("rect").attr("x", 0).attr("y", i * 18 - 11)
      .attr("width", 14).attr("height", 14)
      .attr("fill", color(l)).attr("stroke", "#888");
  });
  const labels = ["Severe (> 150)", "High (76-150)", "Moderate (36-75)", "Low (≤ 35)"];
  labels.forEach((t, i) => {
    legend.append("text").attr("class", "chart-text")
      .attr("x", 20).attr("y", i * 18).text(t);
  });

  // why are some months shorter?
  let reasons = [];
  months.forEach((m, i) => {
    const calendarDays = d3.timeDay.count(new Date(2025, i, 1), new Date(2025, i + 1, 1));
    const recorded = monthly[i].total;
    if (recorded < calendarDays) {
      reasons.push(`${m} has ${calendarDays} days in the calendar but only ${recorded} recorded, so ${calendarDays - recorded} days are missing (sensor offline).`);
    }
  });
  d3.select("#task5-note").text(
    "Why some months are shorter: months have different lengths (Feb has 28 days; Apr, Jun, Sep and Nov have 30; the rest have 31). " +
    reasons.join(" ")
  );
}

// ---------------- Task 6 ----------------
function task6(data) {
  const avg = d3.rollup(data, v => d3.mean(v, d => d.city), d => formatMonth(d.date), d => formatWeekday(d.date));

  const cells = [];
  months.forEach(m => {
    weekdays.forEach(w => {
      cells.push({ month: m, weekday: w, value: avg.get(m).get(w) });
    });
  });

  const h = 470;
  const chartH = h - margin.top - margin.bottom - 50;
  const g = makeChart("#task6", h);

  const x = d3.scaleBand().domain(weekdays).range([0, 560]).padding(0.05);
  const y = d3.scaleBand().domain(months).range([0, chartH]).padding(0.05);
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(d3.extent(cells, d => d.value));

  g.append("g").attr("transform", `translate(0,${chartH})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
  g.append("text").attr("class", "axis-label")
    .attr("x", 280).attr("y", chartH + 35).attr("text-anchor", "middle").text("Day of week");
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)").attr("x", -chartH / 2).attr("y", -45)
    .attr("text-anchor", "middle").text("Month (2025)");

  g.selectAll("rect").data(cells).enter().append("rect")
    .attr("x", d => x(d.weekday))
    .attr("y", d => y(d.month))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.value));

  // colour legend (gradient bar)
  const legendW = 200;
  const legendX = 600;
  const defs = g.append("defs");
  const grad = defs.append("linearGradient").attr("id", "heat-grad")
    .attr("x1", "0%").attr("x2", "0%").attr("y1", "100%").attr("y2", "0%");
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", d3.interpolateYlOrRd(t));
  });
  g.append("rect").attr("x", legendX).attr("y", 0)
    .attr("width", 18).attr("height", legendW)
    .attr("fill", "url(#heat-grad)");
  const legendScale = d3.scaleLinear().domain(color.domain()).range([legendW, 0]);
  g.append("g").attr("transform", `translate(${legendX + 18},0)`)
    .call(d3.axisRight(legendScale).ticks(6));
  g.append("text").attr("class", "chart-text")
    .attr("x", legendX).attr("y", legendW + 20).text("Average PM2.5 (µg/m³)");
}

// ---------------- Task 7 ----------------
function task7(data) {
  const stats = months.map(m => {
    const rows = data.filter(d => formatMonth(d.date) === m);
    return {
      month: m,
      min: d3.min(rows, d => d.city),
      max: d3.max(rows, d => d.city),
      mean: d3.mean(rows, d => d.city)
    };
  });

  const g = makeChart("#task7", height);
  const x = d3.scalePoint().domain(months).range([0, innerW]).padding(0.5);
  const y = d3.scaleLinear().domain([0, d3.max(stats, d => d.max)]).nice().range([innerH, 0]);

  g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Month (2025)", "City PM2.5 (µg/m³)");

  const band = d3.area()
    .x(d => x(d.month))
    .y0(d => y(d.min))
    .y1(d => y(d.max));
  g.append("path").datum(stats)
    .attr("fill", "#9ecae1").attr("opacity", 0.7)
    .attr("d", band);

  const meanLine = d3.line().x(d => x(d.month)).y(d => y(d.mean));
  g.append("path").datum(stats)
    .attr("fill", "none").attr("stroke", "#08306b").attr("stroke-width", 2.5)
    .attr("d", meanLine);
  g.selectAll(".mean-dot").data(stats).enter().append("circle")
    .attr("cx", d => x(d.month)).attr("cy", d => y(d.mean))
    .attr("r", 3.5).attr("fill", "#08306b");

  // legend
  const legend = g.append("g").attr("transform", "translate(10, 0)");
  legend.append("rect").attr("width", 25).attr("height", 12).attr("y", -6)
    .attr("fill", "#9ecae1").attr("opacity", 0.7);
  legend.append("text").attr("class", "chart-text").attr("x", 32).attr("y", 4)
    .text("Monthly min to max");
  legend.append("line").attr("x1", 0).attr("x2", 25).attr("y1", 20).attr("y2", 20)
    .attr("stroke", "#08306b").attr("stroke-width", 2.5);
  legend.append("text").attr("class", "chart-text").attr("x", 32).attr("y", 24)
    .text("Monthly mean");
}

// ---------------- Task 8 ----------------
function task8(data) {
  // split the data into continuous segments at each gap
  const segments = [];
  let current = [data[0]];
  for (let i = 1; i < data.length; i++) {
    if (d3.timeDay.count(data[i - 1].date, data[i].date) > 1) {
      segments.push(current);
      current = [];
    }
    current.push(data[i]);
  }
  segments.push(current);

  // 7-day moving average inside each segment only (never across the gap)
  const maSegments = segments.map(seg =>
    seg.map((d, i) => ({
      date: d.date,
      city: d.city,
      ma7: i >= 6 ? d3.mean(seg.slice(i - 6, i + 1), s => s.city) : null
    }))
  );

  const gaps = findGaps(data);
  const totalMissing = d3.sum(gaps, gp => gp.missing);

  const g = makeChart("#task8", height);
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.city)]).nice().range([innerH, 0]);

  g.append("g").attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b")));
  g.append("g").call(d3.axisLeft(y));
  addAxisTitles(g, innerH, "Date (2025)", "City PM2.5 (µg/m³)");

  // shade the gap
  gaps.forEach(gp => {
    g.append("rect")
      .attr("x", x(gp.before)).attr("y", 0)
      .attr("width", x(gp.after) - x(gp.before)).attr("height", innerH)
      .attr("fill", "#d9d9d9");
    g.append("text").attr("class", "chart-text")
      .attr("x", x(gp.before) + 4).attr("y", 12)
      .text("No data: sensor offline");
    g.append("text").attr("class", "chart-text")
      .attr("x", x(gp.before) + 4).attr("y", 28)
      .text(`${gp.missing} days missing`);
  });

  const dailyLine = d3.line().x(d => x(d.date)).y(d => y(d.city));
  const maLine = d3.line()
    .defined(d => d.ma7 !== null)
    .x(d => x(d.date)).y(d => y(d.ma7));

  // one path per segment, so the line breaks at the gap
  maSegments.forEach(seg => {
    g.append("path").datum(seg)
      .attr("fill", "none").attr("stroke", "#999").attr("stroke-width", 1)
      .attr("opacity", 0.5).attr("d", dailyLine);
    g.append("path").datum(seg)
      .attr("fill", "none").attr("stroke", "#08306b").attr("stroke-width", 3)
      .attr("d", maLine);
  });

  // legend
  const legend = g.append("g").attr("transform", "translate(10, 0)");
  legend.append("line").attr("x1", 0).attr("x2", 25).attr("y1", 0).attr("y2", 0)
    .attr("stroke", "#999").attr("stroke-width", 1).attr("opacity", 0.5);
  legend.append("text").attr("class", "chart-text").attr("x", 32).attr("y", 4).text("Daily value");
  legend.append("line").attr("x1", 0).attr("x2", 25).attr("y1", 20).attr("y2", 20)
    .attr("stroke", "#08306b").attr("stroke-width", 3);
  legend.append("text").attr("class", "chart-text").attr("x", 32).attr("y", 24).text("7-day average");

  let noteText = `Note: ${totalMissing} days are missing in total. `;
  gaps.forEach(gp => {
    noteText += `No readings from ${formatFull(d3.timeDay.offset(gp.before, 1))} to ${formatFull(d3.timeDay.offset(gp.after, -1))}. `;
  });
  noteText += "The line is broken at the gap and the 7-day average is not calculated across it.";
  d3.select("#task8-note").text(noteText);
}

// ---------------- Task 9 ----------------
function task9(data) {
  const mainH = 300;
  const overviewH = 70;
  const gapBetween = 50;
  const totalH = margin.top + mainH + gapBetween + overviewH + margin.bottom;

  const svg = d3.select("#task9").append("svg").attr("width", width).attr("height", totalH);

  // main chart
  const main = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.city)]).nice().range([mainH, 0]);

  // overview chart
  const overview = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top + mainH + gapBetween})`);
  const x2 = d3.scaleTime().domain(x.domain()).range([0, innerW]);
  const y2 = d3.scaleLinear().domain(y.domain()).range([overviewH, 0]);

  // clip path so the zoomed line does not draw outside the main chart
  svg.append("defs").append("clipPath").attr("id", "clip-main")
    .append("rect").attr("width", innerW).attr("height", mainH);

  const xAxisMain = main.append("g").attr("transform", `translate(0,${mainH})`)
    .call(d3.axisBottom(x));
  main.append("g").call(d3.axisLeft(y));
  main.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)").attr("x", -mainH / 2).attr("y", -45)
    .attr("text-anchor", "middle").text("City PM2.5 (µg/m³)");

  const mainLine = d3.line().x(d => x(d.date)).y(d => y(d.city));
  const mainPath = main.append("path").datum(data)
    .attr("clip-path", "url(#clip-main)")
    .attr("fill", "none").attr("stroke", "#c0392b").attr("stroke-width", 1.3)
    .attr("d", mainLine);

  overview.append("g").attr("transform", `translate(0,${overviewH})`)
    .call(d3.axisBottom(x2).tickFormat(d3.timeFormat("%b")));
  const overviewLine = d3.line().x(d => x2(d.date)).y(d => y2(d.city));
  overview.append("path").datum(data)
    .attr("fill", "none").attr("stroke", "#888").attr("stroke-width", 1)
    .attr("d", overviewLine);
  overview.append("text").attr("class", "axis-label")
    .attr("x", innerW / 2).attr("y", overviewH + 38)
    .attr("text-anchor", "middle").text("Overview of the whole year (drag to select)");

  function updateMain() {
    xAxisMain.call(d3.axisBottom(x));
    mainPath.attr("d", mainLine);
  }

  const brush = d3.brushX()
    .extent([[0, 0], [innerW, overviewH]])
    .on("end", event => {
      if (!event.selection) return;
      const [start, end] = event.selection.map(x2.invert);
      x.domain([start, end]);
      updateMain();
    });

  const brushG = overview.append("g").call(brush);

  d3.select("#reset-btn").on("click", () => {
    x.domain(x2.domain());
    updateMain();
    brushG.call(brush.move, null);
  });
}
