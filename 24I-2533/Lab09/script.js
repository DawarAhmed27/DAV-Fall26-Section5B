// Lab 09 - Dawar Ahmed (24I-2533, 5B)
// Hierarchical (treemap, dendrogram), network (force graph) and geospatial (maps) charts in D3.js

// One shared tooltip for every chart
const tooltip = d3.select("#tooltip");

function showTooltip(event, html) {
  tooltip.html(html)
    .style("left", (event.pageX + 12) + "px")
    .style("top", (event.pageY - 10) + "px")
    .style("opacity", 1);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// Load all datasets first, then draw every chart
Promise.all([
  d3.csv("university.csv", d3.autoType),
  d3.csv("flights.csv", d3.autoType),
  d3.csv("population.csv", d3.autoType),
  d3.csv("pakistan_cities.csv", d3.autoType),
  d3.json("custom.geo.json")
]).then(([university, flights, population, cities, world]) => {
  drawTreemap(university);
  drawDendrogram(university);
  drawNetwork(flights);
  drawChoropleth(population, world);
  drawPointMap(cities, world);
  drawCombinedMap(cities, flights, world);
});


// Converts flat rows (department, course, students) into
// University -> Department -> Course, which d3.hierarchy can read
function buildHierarchy(rows) {
  const byDepartment = d3.group(rows, d => d.department);
  return {
    name: "University",
    children: Array.from(byDepartment, ([department, courses]) => ({
      name: department,
      children: courses.map(c => ({
        name: c.course,
        department: c.department,
        students: c.students
      }))
    }))
  };
}


// ---------------- TASK 1: TREEMAP ----------------
function drawTreemap(data) {
  const width = 960, height = 540;
  const top = 40;   // space for the title
  const legendHeight = 40;

  const svg = d3.select("#treemap").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  svg.append("text")
    .attr("x", width / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", 18).attr("font-weight", "bold")
    .text("Student Enrollment by Department and Course");

  // sum() gives every node a value (total students), sort() puts big rectangles first
  const root = d3.hierarchy(buildHierarchy(data))
    .sum(d => d.students)
    .sort((a, b) => b.value - a.value);

  // The layout adds x0, y0, x1, y1 to every node
  d3.treemap()
    .size([width, height - top - legendHeight])
    .paddingOuter(3)
    .paddingTop(3)
    .paddingInner(2)(root);

  const departments = root.children.map(d => d.data.name);
  const color = d3.scaleOrdinal()
    .domain(departments)
    .range(["#4e79a7", "#f28e2b", "#59a14f", "#e15759"]);

  const leaf = svg.append("g")
    .attr("transform", `translate(0, ${top})`)
    .selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

  leaf.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => color(d.data.department))
    .attr("stroke", "#ffffff")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#222222").attr("stroke-width", 2);
      showTooltip(event,
        `<b>${d.data.name}</b><br>Department: ${d.data.department}<br>Students: ${d.data.students}`);
    })
    .on("mousemove", (event, d) => showTooltip(event,
      `<b>${d.data.name}</b><br>Department: ${d.data.department}<br>Students: ${d.data.students}`))
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 1);
      hideTooltip();
    });

  // Course name label
  leaf.append("text")
    .attr("x", 6).attr("y", 18)
    .attr("fill", "#ffffff")
    .attr("font-size", 13).attr("font-weight", "bold")
    .attr("pointer-events", "none")
    .text(d => d.data.name);

  // Student count under the name
  leaf.append("text")
    .attr("x", 6).attr("y", 34)
    .attr("fill", "#ffffff")
    .attr("font-size", 12)
    .attr("pointer-events", "none")
    .text(d => d.data.students + " students");

  // Legend for the four departments
  const legend = svg.append("g")
    .attr("transform", `translate(${width / 2 - 260}, ${height - 18})`);

  let offset = 0;
  departments.forEach(dept => {
    const item = legend.append("g").attr("transform", `translate(${offset}, 0)`);
    offset += 30 + dept.length * 7.5;
    item.append("rect").attr("width", 14).attr("height", 14).attr("y", -11).attr("fill", color(dept));
    item.append("text").attr("x", 20).attr("font-size", 13).text(dept);
  });
}


// ---------------- TASK 2: DENDROGRAM ----------------
function drawDendrogram(data) {
  const width = 960, height = 520;
  const margin = { top: 20, right: 170, bottom: 20, left: 110 };

  const svg = d3.select("#dendrogram").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Node color by depth: 0 = root, 1 = department, 2 = course
  const depthColor = ["#e15759", "#4e79a7", "#59a14f"];
  const depthName = ["University (root)", "Department", "Course"];

  const root = d3.hierarchy(buildHierarchy(data));

  // d3.cluster puts all leaves at the same depth (a dendrogram)
  const cluster = d3.cluster()
    .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

  // Horizontal tree: y is used as horizontal position, x as vertical
  const linkPath = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

  function update() {
    cluster(root);
    g.selectAll("*").remove();

    g.selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", linkPath)
      .attr("fill", "none")
      .attr("stroke", "#aaaaaa")
      .attr("stroke-width", 1.5);

    const node = g.selectAll("g.node")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y}, ${d.x})`);

    node.append("circle")
      .attr("r", d => d.depth === 2 ? 5 : 7)
      // a collapsed department is drawn hollow
      .attr("fill", d => d._children ? "#ffffff" : depthColor[d.depth])
      .attr("stroke", d => depthColor[d.depth])
      .attr("stroke-width", 2)
      .style("cursor", d => d.depth === 1 ? "pointer" : "default")
      .on("click", (event, d) => {
        if (d.depth !== 1) return;
        // swap children and _children to collapse / expand
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update();
      });

    // Leaf labels go on the right, parent labels on the left
    node.append("text")
      .attr("dy", "0.32em")
      // a node with no visible children (course or collapsed department) is a leaf
      .attr("x", d => d.children ? -12 : 10)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .attr("font-size", 13)
      .text(d => d._children ? d.data.name + " (+)" : d.data.name);
  }

  update();

  // Legend for node colors
  const legend = svg.append("g").attr("transform", `translate(20, ${height - 70})`);
  depthName.forEach((name, i) => {
    legend.append("circle").attr("cx", 6).attr("cy", i * 22).attr("r", 6).attr("fill", depthColor[i]);
    legend.append("text").attr("x", 18).attr("y", i * 22).attr("dy", "0.32em").attr("font-size", 12).text(name);
  });
}


// ---------------- TASK 3: FORCE-DIRECTED NETWORK ----------------
function drawNetwork(flights) {
  const width = 960, height = 560;

  const svg = d3.select("#network").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  // Build the node list from the edge list using a Set (removes duplicates)
  const cityNames = new Set();
  flights.forEach(f => {
    cityNames.add(f.source);
    cityNames.add(f.target);
  });
  const nodes = Array.from(cityNames, name => ({ id: name }));

  // Degree = number of routes touching a city
  nodes.forEach(n => {
    n.degree = flights.filter(f => f.source === n.id || f.target === n.id).length;
  });

  // Copy the links because forceLink replaces source/target names with node objects
  const links = flights.map(f => ({ source: f.source, target: f.target, flights: f.flights }));

  const widthScale = d3.scaleLinear()
    .domain(d3.extent(links, d => d.flights))
    .range([1.5, 12]);

  const radiusScale = d3.scaleSqrt()
    .domain([1, d3.max(nodes, d => d.degree)])
    .range([8, 26]);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(140))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(d => radiusScale(d.degree) + 6));

  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#7f8c8d")
    .attr("stroke-opacity", 0.7)
    .attr("stroke-width", d => widthScale(d.flights));

  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .style("cursor", "grab")
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

  node.append("circle")
    .attr("r", d => radiusScale(d.degree))
    .attr("fill", "#4e79a7")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2);

  node.append("text")
    .attr("y", d => radiusScale(d.degree) + 14)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .attr("pointer-events", "none")
    .text(d => d.id);

  // Hover: highlight the city's routes and neighbours, fade the rest
  node.on("mouseover", (event, d) => {
    link.attr("stroke-opacity", l => (l.source === d || l.target === d) ? 1 : 0.08)
      .attr("stroke", l => (l.source === d || l.target === d) ? "#e15759" : "#7f8c8d");
    node.style("opacity", n => {
      const connected = links.some(l =>
        (l.source === d && l.target === n) || (l.target === d && l.source === n));
      return (n === d || connected) ? 1 : 0.2;
    });
    showTooltip(event, `<b>${d.id}</b><br>Routes: ${d.degree}`);
  })
    .on("mousemove", (event, d) => showTooltip(event, `<b>${d.id}</b><br>Routes: ${d.degree}`))
    .on("mouseout", () => {
      link.attr("stroke-opacity", 0.7).attr("stroke", "#7f8c8d");
      node.style("opacity", 1);
      hideTooltip();
    });

  // On every tick, keep nodes inside the SVG and move lines and circles
  simulation.on("tick", () => {
    nodes.forEach(d => {
      const r = radiusScale(d.degree);
      d.x = Math.max(r, Math.min(width - r, d.x));
      d.y = Math.max(r, Math.min(height - r - 16, d.y));
    });
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  // Small legend for link width
  const legend = svg.append("g").attr("transform", "translate(20, 24)");
  legend.append("text").attr("font-size", 12).attr("font-weight", "bold").text("Flights per week");
  [10, 40, 70].forEach((v, i) => {
    legend.append("line")
      .attr("x1", 0).attr("x2", 40)
      .attr("y1", 20 + i * 20).attr("y2", 20 + i * 20)
      .attr("stroke", "#7f8c8d").attr("stroke-width", widthScale(v));
    legend.append("text").attr("x", 50).attr("y", 20 + i * 20).attr("dy", "0.32em").attr("font-size", 12).text(v);
  });
}


// ---------------- TASK 4: CHOROPLETH ----------------
function drawChoropleth(population, world) {
  const width = 960, height = 520;

  const svg = d3.select("#choropleth").append("svg")
    .attr("viewBox", [0, 0, width, height]);

  // Lookup table: country code -> row. Map features are joined on properties.adm0_a3
  // (iso_a3 is "-99" for France in this file, so it cannot be used as the key)
  const popByCode = new Map(population.map(d => [d.id, d]));

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height - 50], world);
  const path = d3.geoPath(projection);

  const extent = d3.extent(population, d => d.population_millions);
  const color = d3.scaleSequentialSqrt(d3.interpolateBlues)
    .domain(extent);

  svg.append("g")
    .selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const row = popByCode.get(d.properties.adm0_a3);
      return row ? color(row.population_millions) : "#e0e0e0";  // missing data = light gray
    })
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#222222").attr("stroke-width", 1.5).raise();
      showTooltip(event, choroplethText(d));
    })
    .on("mousemove", (event, d) => showTooltip(event, choroplethText(d)))
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 0.5);
      hideTooltip();
    });

  function choroplethText(d) {
    const row = popByCode.get(d.properties.adm0_a3);
    return row
      ? `<b>${row.country}</b><br>Population: ${row.population_millions} million`
      : `<b>${d.properties.name}</b><br>No data`;
  }

  // Gradient legend with min and max labels
  const legendWidth = 260;
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "pop-gradient");
  d3.range(0, 1.01, 0.1).forEach(t => {
    const value = extent[0] + t * (extent[1] - extent[0]);
    gradient.append("stop").attr("offset", t * 100 + "%").attr("stop-color", color(value));
  });

  const legend = svg.append("g").attr("transform", `translate(${width / 2 - legendWidth / 2}, ${height - 40})`);
  legend.append("text").attr("x", legendWidth / 2).attr("y", -6).attr("text-anchor", "middle")
    .attr("font-size", 12).text("Population (millions)");
  legend.append("rect").attr("width", legendWidth).attr("height", 12)
    .attr("fill", "url(#pop-gradient)").attr("stroke", "#999999");
  legend.append("text").attr("y", 28).attr("font-size", 12).text(extent[0] + " M (min)");
  legend.append("text").attr("x", legendWidth).attr("y", 28).attr("text-anchor", "end")
    .attr("font-size", 12).text(extent[1] + " M (max)");

  legend.append("rect").attr("x", legendWidth + 30).attr("width", 12).attr("height", 12)
    .attr("fill", "#e0e0e0").attr("stroke", "#999999");
  legend.append("text").attr("x", legendWidth + 48).attr("y", 10).attr("font-size", 12).text("No data");
}


// Faisalabad sits right next to Lahore, so its label goes on the left to avoid overlap
const labelOnLeft = new Set(["Faisalabad"]);

// Shared base map for Tasks 5 and 6: Mercator projection fitted to Pakistan
function pakistanBaseMap(container, world, width, height, mapWidth = width) {
  const svg = d3.select(container).append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const pakistan = world.features.find(f => f.properties.adm0_a3 === "PAK");

  const projection = d3.geoMercator()
    .center([69.3, 30.4])
    .fitExtent([[40, 40], [mapWidth - 40, height - 40]], pakistan);
  const path = d3.geoPath(projection);

  // Draw all countries so neighbours show, but clip to the SVG box
  svg.append("clipPath").attr("id", container.slice(1) + "-clip")
    .append("rect").attr("width", width).attr("height", height);

  svg.append("g")
    .attr("clip-path", `url(${container}-clip)`)
    .selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => d === pakistan ? "#f2efe6" : "#f7f7f7")
    .attr("stroke", d => d === pakistan ? "#888888" : "#cccccc")
    .attr("stroke-width", d => d === pakistan ? 1.2 : 0.6);

  return { svg, projection };
}


// ---------------- TASK 5: PAKISTAN POINT MAP ----------------
function drawPointMap(cities, world) {
  const width = 800, height = 620;
  const { svg, projection } = pakistanBaseMap("#pointmap", world, width, height);

  // Square-root scale so circle AREA is proportional to population
  const radius = d3.scaleSqrt()
    .domain([0, d3.max(cities, d => d.pop)])
    .range([0, 36]);

  // Big circles first so small ones stay on top
  const sorted = cities.slice().sort((a, b) => b.pop - a.pop);

  svg.append("g")
    .selectAll("circle")
    .data(sorted)
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])   // longitude first
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", d => Math.max(radius(d.pop), 3))
    .attr("fill", "#e15759")
    .attr("fill-opacity", 0.55)
    .attr("stroke", "#a12b2d")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke-width", 2.5);
      showTooltip(event, `<b>${d.name}</b><br>Population: ${d.pop} million`);
    })
    .on("mousemove", (event, d) => showTooltip(event, `<b>${d.name}</b><br>Population: ${d.pop} million`))
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 1);
      hideTooltip();
    });

  // Labels only for cities above 1 million
  svg.append("g")
    .selectAll("text")
    .data(cities.filter(d => d.pop > 1))
    .join("text")
    .attr("x", d => labelOnLeft.has(d.name)
      ? projection([d.lon, d.lat])[0] - radius(d.pop) - 4
      : projection([d.lon, d.lat])[0] + radius(d.pop) + 4)
    .attr("y", d => projection([d.lon, d.lat])[1])
    .attr("text-anchor", d => labelOnLeft.has(d.name) ? "end" : "start")
    .attr("dy", "0.32em")
    .attr("font-size", 13)
    .attr("pointer-events", "none")
    .text(d => d.name);

  // Size legend
  const legend = svg.append("g").attr("transform", `translate(${width - 150}, ${height - 120})`);
  legend.append("text").attr("font-size", 12).attr("font-weight", "bold").text("Population (millions)");
  [1, 5, 15].forEach((v, i) => {
    legend.append("circle")
      .attr("cx", 40).attr("cy", 85 - radius(v))
      .attr("r", radius(v))
      .attr("fill", "none").attr("stroke", "#666666");
    legend.append("text")
      .attr("x", 85).attr("y", 85 - 2 * radius(v)).attr("dy", "0.32em")
      .attr("font-size", 11).text(v);
  });
}


// ---------------- TASK 6: COMBINED MAP ----------------
function drawCombinedMap(cities, flights, world) {
  const width = 1060, height = 640;
  // map uses the left part of the SVG, the legend sits on the right
  const { svg, projection } = pakistanBaseMap("#combined", world, width, height, width - 260);

  // Match each route's source and target to the city coordinates
  const cityByName = new Map(cities.map(c => [c.name, c]));
  cities.forEach(c => {
    [c.x, c.y] = projection([c.lon, c.lat]);
    c.routes = flights.filter(f => f.source === c.name || f.target === c.name).length;
    c.isHub = c.routes >= 4;
  });
  const routes = flights.map(f => ({
    source: cityByName.get(f.source),
    target: cityByName.get(f.target),
    flights: f.flights
  }));

  const lineWidth = d3.scaleLinear()
    .domain(d3.extent(flights, d => d.flights))
    .range([1, 10]);
  const radius = d3.scaleSqrt()
    .domain([0, d3.max(cities, d => d.pop)])
    .range([0, 30]);
  const hubColor = d => d.isHub ? "#e15759" : "#4e79a7";

  // 1) routes first
  const routeLines = svg.append("g")
    .selectAll("line")
    .data(routes)
    .join("line")
    .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
    .attr("stroke", "#555555")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", d => lineWidth(d.flights))
    .attr("stroke-linecap", "round");

  // 2) cities on top (largest first so small ones are not hidden)
  const sorted = cities.slice().sort((a, b) => b.pop - a.pop);
  const cityCircles = svg.append("g")
    .selectAll("circle")
    .data(sorted)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => Math.max(radius(d.pop), 3))
    .attr("fill", hubColor)
    .attr("fill-opacity", 0.75)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5);

  const labels = svg.append("g")
    .selectAll("text")
    .data(cities)
    .join("text")
    .attr("x", d => labelOnLeft.has(d.name)
      ? d.x - Math.max(radius(d.pop), 3) - 4
      : d.x + Math.max(radius(d.pop), 3) + 4)
    .attr("y", d => d.y)
    .attr("text-anchor", d => labelOnLeft.has(d.name) ? "end" : "start")
    .attr("dy", "0.32em")
    .attr("font-size", 12)
    .attr("pointer-events", "none")
    .text(d => d.name);

  const cityText = d =>
    `<b>${d.name}</b><br>Population: ${d.pop} million<br>Routes: ${d.routes}${d.isHub ? " (hub)" : ""}`;

  // Hover: highlight this city's routes, dim the rest
  cityCircles
    .on("mouseover", (event, d) => {
      const touches = r => r.source === d || r.target === d;
      routeLines
        .attr("stroke-opacity", r => touches(r) ? 0.9 : 0.06)
        .attr("stroke", r => touches(r) ? "#e15759" : "#555555");
      const neighbours = new Set([d]);
      routes.filter(touches).forEach(r => { neighbours.add(r.source); neighbours.add(r.target); });
      cityCircles.attr("fill-opacity", c => neighbours.has(c) ? 0.9 : 0.15);
      labels.attr("opacity", c => neighbours.has(c) ? 1 : 0.25);
      showTooltip(event, cityText(d));
    })
    .on("mousemove", (event, d) => showTooltip(event, cityText(d)))
    .on("mouseout", () => {
      routeLines.attr("stroke-opacity", 0.5).attr("stroke", "#555555");
      cityCircles.attr("fill-opacity", 0.75);
      labels.attr("opacity", 1);
      hideTooltip();
    });

  // Legend explaining all four encodings
  const legend = svg.append("g").attr("transform", `translate(${width - 235}, 30)`);
  legend.append("rect")
    .attr("x", -12).attr("y", -16).attr("width", 225).attr("height", 300)
    .attr("fill", "#ffffff").attr("fill-opacity", 0.9).attr("stroke", "#cccccc");

  legend.append("text").attr("font-size", 13).attr("font-weight", "bold").text("Legend");

  // Position
  legend.append("text").attr("y", 22).attr("font-size", 12).text("Position = city location");

  // Size
  legend.append("text").attr("y", 48).attr("font-size", 12).text("Circle size = population (M)");
  [1, 5, 15].forEach((v, i) => {
    const cx = 20 + i * 55;
    legend.append("circle").attr("cx", cx).attr("cy", 85).attr("r", radius(v))
      .attr("fill", "none").attr("stroke", "#666666");
    legend.append("text").attr("x", cx).attr("y", 128).attr("text-anchor", "middle")
      .attr("font-size", 11).text(v);
  });

  // Color
  legend.append("text").attr("y", 156).attr("font-size", 12).text("Color = hub status");
  [["Hub (4+ routes)", true], ["Not a hub", false]].forEach(([label, isHub], i) => {
    legend.append("circle").attr("cx", 8).attr("cy", 176 + i * 20).attr("r", 7)
      .attr("fill", hubColor({ isHub })).attr("fill-opacity", 0.75);
    legend.append("text").attr("x", 22).attr("y", 176 + i * 20).attr("dy", "0.32em")
      .attr("font-size", 11).text(label);
  });

  // Line width
  legend.append("text").attr("y", 228).attr("font-size", 12).text("Line width = flights per week");
  [10, 40, 70].forEach((v, i) => {
    const x = i * 65;
    legend.append("line").attr("x1", x).attr("x2", x + 40).attr("y1", 252).attr("y2", 252)
      .attr("stroke", "#555555").attr("stroke-opacity", 0.6)
      .attr("stroke-width", lineWidth(v)).attr("stroke-linecap", "round");
    legend.append("text").attr("x", x + 20).attr("y", 274).attr("text-anchor", "middle")
      .attr("font-size", 11).text(v);
  });
}
