"use strict";

function readCSV(file) {
  // Object Parses a string to date according to the format
  const timeParse = d3.timeParse("%Y-%m-%d");

  const data = d3.csv(file, function (d) {
    // Function is used instead of autotype since I wanted to rename
    // the columns. Also removes entries with no city.
    if (d.Gemeentenaam != "") {
      return {
        date: timeParse(d.Datum),
        city: d.Gemeentenaam,
        cityCode: +d.Gemeentecode,
        province: d.Provincienaam,
        number: +d.Aantal,
      };
    }
  });
  return data;
}

function linePlot(data, figHeight, figWidth) {
  /*
    Draw the lineplot for the number of instances of COVID-19 per city over time
  */

  const margin = { top: 20, bottom: 20, left: 20, right: 20 };
  const padding = { top: 40, bottom: 40, left: 40, right: 150 };

  const innerHeight = figHeight - (margin.top + margin.bottom);
  const innerWidth = figWidth - (margin.left + margin.right);

  const height = innerHeight - (padding.top + padding.bottom);
  const width = innerWidth - (padding.left + padding.right);

  /* Data Manipulation and storage */

  const latestDate = d3.max(data, (d) => d.date);
  const earliestDate = d3.min(data, (d) => d.date);

  // Groups the data by city and calculates aggregate data. Sorted according to max values per city(descending order)
  const cityAgg = d3
    .nest()
    .key((d) => d.city)
    .rollup(function (leaf) {
      return {
        max: d3.max(leaf, (x) => x.number),
        // mean: d3.mean(leaf, (x) => x.number),
        maxNew: d3.max(leaf, (x, ind) =>
          ind === 0 ? x.number : x.number - leaf[ind - 1].number
        ),
        // meanNew: d3.mean(leaf, (x, ind) =>
        //   ind === 0 ? x.number : x.number - leaf[ind - 1].number
        // ),
      };
    })
    .entries(data)
    .sort((a, b) => b.value.max - a.value.max);

  // The maximum number of instances at any point in the dataset
  const maxNumber = d3.max(data, (d) => d.number);
  const maxNew = d3.max(cityAgg, (d) => d.value.maxNew);

  // The names of all the cities in the dataset
  const allCities = cityAgg.map((d) => d.key);

  // Choose the top 5 cities with cases. Only 5 since more would be cluttered.
  let cities = allCities.slice(0, 5);

  // Store order of the cities
  let cityIndex = {};
  allCities.forEach((key, index) => (cityIndex[key] = index));

  // Add the Mean value to the list of cities and make it the last index value (always at the bottom)
  // cities.push("Mean");
  // cityIndex["Mean"] = allCities.length;

  // Constructs a full nest of the data according the city. Stores all data.
  const fullNest = d3
    .nest()
    .key((d) => d.city)
    .entries(data);

  // const yearsNest = d3
  //   .nest()
  //   .key((d) => d.date)
  //   .rollup(function (leaves) {
  //     return {
  //       date: leaves[0].date,
  //       mean: d3.mean(leaves, (x) => x.number),
  //       meanNew: d3.mean(leaves, (x, ind) =>
  //         ind === 0 ? x.number : x.number - leaves[ind - 1].number
  //       ),
  //     };
  //   })
  //   .entries(data)
  //   .map((d) => d.value);

  // Get number of instances in each city per day
  const casesPerDay = fullNest.map(function (elem) {
    let number; // Used to store the number of new instances in each day
    return {
      key: elem.key,
      values: elem.values.map(function (d, index) {
        number =
          index === 0 ? d.number : d.number - elem.values[index - 1].number;
        number = number < 0 ? 0 : number;
        return {
          date: d.date,
          number: number,
        };
      }),
    };
  });

  /* Add meta-features to the lineplot (filter, etc) */

  const interact = d3.select("#lineInteract");

  // Create a field containing a list of all cities to choose from as filters
  const filters = interact
    .append("fieldset")
    .style("display", "block")
    .style("max-height", `${figHeight}px`)
    .style("min-height", `${figHeight}px`)
    .style("vertical-align", "top")
    .style("min-width", "290px");

  // Legend (Label) for the fieldset
  filters.append("legend").html("Cities");

  // Create search entry
  filters
    .append("input")
    .attr("type", "text")
    .attr("id", "citySearch")
    .attr("placeholder", "Search for cities..")
    .on("keyup", () => citySearch(d3.event.path[0]));

  // Add cities as list items that are clickable
  filters
    .append("ul")
    .attr("id", "cityFilter")
    .selectAll(".cities")
    .data(allCities.concat(["Mean"]))
    .enter()
    .append("li")
    .append("a")
    .attr("class", (d) => (cities.includes(d) ? "filter selected" : "filter"))
    .attr("href", "#")
    .on("click", clickFilter)
    .html((d) => d);

  // Create toggle for new cases per day

  const casesToggle = interact
    .append("div")
    .attr("class", "theme-switch-wrapper")
    .style("display", "block")
    .style("margin", "10px 10px");

  casesToggle
    .append("span")
    .style("display", "inline-block")
    .style("padding", "10px 0px")
    .text("Toggle for cases per day")

  casesToggle
    .append("label")
    .style("float", "right")
    .attr("class", "theme-switch")
    .attr("for", "changeChart")
    .append("input")
    .attr("type", "checkbox")
    .attr("id", "changeChart")
    .on("click", changeChartType)
    .select(function () {
      return this.parentNode;
    })
    .append("div")
    .attr("class", "slider round");

  // Outer parts of the plot (Title, X Label, Y Label, etc)
  const svg = d3
    .select("#lineChart")
    .append("svg")
    .attr("height", figHeight)
    .attr("width", figWidth)
    .append("g")
    .attr("height", innerHeight)
    .attr("width", innerWidth)
    .attr("transform", translate(margin.left, margin.top));

  // Plot Title
  svg
    .append("text")
    .attr("class", "plot title")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", 25)
    .text("Growth of COVID-19 in the Netherlands");

  // Subtitle
  svg
    .append("text")
    .attr("class", "plot subtitle")
    .attr("x", 0)
    .attr("y", padding.top / 2)
    .text("Seperated by City");

  // X axis
  svg
    .append("text")
    .attr("id", "xlabel")
    .attr("class", "plot xaxis")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight)
    .text("Date");

  // Y axis
  svg
    .append("text")
    .attr("id", "ylabel")
    .attr("class", "plot yaxis")
    .attr("x", -(padding.top + height / 2))
    .attr("y", -(padding.left / 2))
    .attr("transform", "rotate(-90)")
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Number of instances");

  /* Plot Drawing */

  const plot = svg
    .append("g")
    .attr("class", "plot")
    .attr("transform", translate(padding.left, padding.top));

  // Scale for the X axis. Maps the date to the width on the plot
  const xScale = d3
    .scaleTime()
    .domain([earliestDate, latestDate])
    .range([0, width])
    .nice();

  // Scale for the Y axis. Inverted range since it is drawn from top down
  const yScale = d3
    .scaleLinear()
    .domain([0, maxNumber])
    .range([height, 0])
    .nice();

  // Used to color the lines of the different cities according to the name of the city
  const colorScale = d3.scaleOrdinal().range(d3.schemePaired).domain(allCities);

  const axes = plot.append("g").attr("class", "plot axes");

  const xAxis = axes
    .append("g")
    .attr("class", "plot xaxis")
    .attr("transform", translate(0, height))
    .attr("text-anchor", "middle")
    .call(
      d3
        .axisBottom(xScale)
        .ticks(d3.timeMonth.every(0.5)));

  // Draw Gridlines for Y axis
  axes
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).ticks(5).tickFormat(""));

  const yAxis = axes
    .append("g")
    .attr("class", "plot yaxis")
    .call(d3.axisLeft(yScale));

  /* Draw the lines for each city */

  const lines = plot.append("g").attr("class", "lines");

  // Draw the lines for each city over time. Only the top 5 are shown by default.
  lines
    .selectAll(".line")
    .data(fullNest)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("class", "line")
    .attr("id", (d) => cleanText(d.key))
    .attr("stroke", (d) => colorScale(d.key))
    .attr("stroke-width", 1.5)
    .attr("d", function (d) {
      return d3
        .line()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.number))(d.values);
    })
    .style("opacity", function (d) {
      const opacity = cities.includes(d.key) ? 1 : 0;
      return opacity;
    });

  // The line for the mean over time. Dotted grey line
  // const meanLine = lines
  //   .append("path")
  //   .attr("id", "Mean")
  //   .attr("class", "line mean")
  //   .attr("stroke", "grey")
  //   .attr("stroke-dasharray", "3, 5")
  //   .attr(
  //     "d",
  //     d3
  //       .line()
  //       .x((d) => xScale(d.date))
  //       .y((d) => yScale(d.mean))(yearsNest)
  //   )
  //   .style("fill", "none");

  // The text for the mean line. Follows the mean line path.
  // lines
  //   .append("text")
  //   .attr("class", "mean")
  //   .attr("dy", -5)
  //   .style("font-size", "1em")
  //   .attr("stroke-width", "0")
  //   .style("font-family", "monospace")
  //   .append("textPath")
  //   .attr("xlink:href", "#Mean")
  //   .attr("startOffset", "95%")
  //   .text("Mean");

  /* Draw the legend for the cities */

  // The group where the legends are going to be drawn
  const legend = svg
    .append("g")
    .attr("class", "plot legend")
    .attr("transform", translate(padding.left + width, padding.top))
    .style("fill", "white");

  // let tmp = legend.append("rect")

  drawLegend(cities, legend);

  function drawLegend(entries) {
    legend
      .selectAll("plot legend values")
      .data(entries)
      .enter()
      .append("g")
      .attr("id", (d) => cleanText(d))
      // .attr("transform", translate(width, 0))
      .append("circle")
      // .attr("id", d => cleanText(d))
      .attr("cx", 20)
      .attr("cy", (d, i) => 5 + i * 25)
      .attr("r", 7)
      .style("fill", (d) => (d === "Mean" ? "grey" : colorScale(d)))
      .select(function (d) {
        return this.parentNode;
      })
      .append("text")
      .attr("x", 40)
      .attr("y", (d, i) => 5 + i * 25)
      .style("fill", (d) => (d === "Mean" ? "grey" : colorScale(d)))
      .attr("text-anchor", "left")
      .attr("alignment-baseline", "middle")
      .text((d) => d);
  }

  function clickFilter(datum) {
    // Clean Text for ID entry. For example, no spaces or apostrophes.
    const cleanedName = cleanText(datum);

    // Either select the mean class (line+text) or the city id for the line
    const datumClass = cleanedName === "Mean" ? ".mean" : `#${cleanedName}`;

    // Get the opposite of the current opacity and change it to that
    const currentOpacity = d3.select(datumClass).style("opacity");
    const opacity = currentOpacity == 1 ? 0 : 1;
    d3.selectAll(datumClass).transition().style("opacity", opacity);

    // Add or remove city from list of cities in the legend
    if (cities.includes(datum)) {
      d3.select(this).classed("selected", false);
      cities = cities.filter((elem) => elem !== datum);
    } else {
      d3.select(this).classed("selected", true);
      cities = cities.concat(datum);
    }

    // Resort according to index value
    cities = cities.sort((a, b) => cityIndex[a] - cityIndex[b]);

    // Redraw the legend
    updateLegend(cities);
  }

  function updateLegend(entries) {
    // Transition to 0 opacity for effect (since remove cannot be transitioned to)
    const legendChildren = legend.selectAll("*");
    legendChildren.transition().delay(100).style("opacity", 0);

    legendChildren.remove();

    // Set opacity to 0 so items to do not immediately appear, only after transition
    legend.style("opacity", 0);

    // Redraw according for the cities provided
    drawLegend(entries);

    // Set opacity to 1 with transition
    legend.transition().style("opacity", 1);
  }

  function citySearch(elem) {
    // The value currently present in text entry
    const key = elem.value.toUpperCase();

    // Select the unordered list
    const list = document.getElementById("cityFilter");

    // Select all list items
    const items = list.getElementsByTagName("li");

    let a, txtValue;
    for (let i = 0; i < items.length; i++) {
      // Get the hyperref element
      a = items[i].getElementsByTagName("a")[0];

      // Select the text from the element
      txtValue = a.textContent || a.innerText;

      // Checks if the key (text entry) has ever appeared in the text for the element
      if (txtValue.toUpperCase().indexOf(key) > -1) {
        items[i].style.display = "";
      } else {
        items[i].style.display = "none";
      }
    }
  }

  function changeChartType() {
    // Total duration for the transition of chart type
    const length = 500;

    let newData, ylabel, meanVal;
    const checked = d3.select("#changeChart").property("checked");

    if (checked) {
      newData = casesPerDay;
      yScale.domain([0, maxNew]).nice();
      ylabel = "New cases";
      meanVal = "meanNew";
    } else {
      newData = fullNest;
      yScale.domain([0, maxNumber]).nice();
      ylabel = "Number of instances";
      meanVal = "mean";
    }

    axes
      .select(".grid")
      .transition()
      .duration(length)
      .call(d3.axisLeft(yScale).tickSize(-width).ticks(5).tickFormat(""));
    yAxis.transition().duration(length).call(d3.axisLeft(yScale));
    
    d3.select("#ylabel").text(ylabel);

    const line = lines.selectAll(".line").data(newData);

    // Redraw the lines
    line
      .enter()
      .append("path")
      .merge(line)
      .transition()
      .duration(length)
      .attr("fill", "none")
      .attr("class", "line")
      .attr("id", (d) => cleanText(d.key))
      .attr("stroke", (d) => colorScale(d.key))
      .attr("stroke-width", 1.5)
      .attr("d", function (d) {
        return d3
          .line()
          .x((d) => xScale(d.date))
          .y((d) => yScale(d.number))(d.values);
      })
      .style("opacity", function (d) {
        const opacity = cities.includes(d.key) ? 1 : 0;
        return opacity;
      });

    // Draw mean line
    // meanLine
    //   .transition()
    //   .duration(length)
    //   .attr(
    //     "d",
    //     d3
    //       .line()
    //       .x((d) => xScale(d.date))
    //       .y((d) => yScale(d[meanVal]))(yearsNest)
    //  );
  }
}

function translate(x, y) {
  // Helper function for translate CSS
  return `translate(${x}, ${y})`;
}

function cleanText(text) {
  // Removes spaces, commas and quotes from string
  let cleanText = text.includes("'") ? text.replace("'", "") : text;
  cleanText = cleanText.includes(" ")
    ? cleanText.replace(/\s+/g, "_")
    : cleanText;
  cleanText = cleanText.includes(",") ? cleanText.replace(",", "") : cleanText;

  return cleanText;
}

function main() {
  const infectionsURL =
    "https://raw.githubusercontent.com/J535D165/CoronaWatchNL/master/data/rivm_NL_covid19_total_municipality.csv";

  // Read data and plot graph first since it's an async function
  const data = readCSV(infectionsURL);
  data.then((data) => linePlot(data, 500, 1250));
}

main();
