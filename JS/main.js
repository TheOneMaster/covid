'use strict' 

function readCSV(file) {
    
    // Object Parses a string to date according to the format
    const timeParse = d3.timeParse("%Y-%m-%d");

    const data = d3.csv(file, function(d) {
        // Function is used instead of autotype since I wanted to rename
        // the columns. Also removes entries with no city.
        if (d.Gemeentenaam != ""){
            return {
                date: timeParse(d.Datum),
                city: d.Gemeentenaam,
                cityCode: +d.Gemeentecode,
                province: d.Provincienaam,
                number: +d.Aantal
            }
        } 
    });
    return data
}

function linePlot(data, figHeight, figWidth) {

    const margin = {top:20, bottom:20, left:20, right:20};
    const padding = {top:40, bottom:40, left:40, right:20};

    const innerHeight = figHeight - (margin.top + margin.bottom);
    const innerWidth = figWidth - (margin.left + margin.right);

    const height = innerHeight - (padding.top + padding.bottom);
    const width = innerWidth - (padding.left + padding.right);

    const latestDate = d3.max(data, d => d.date);
    const earliestDate = d3.min(data, d => d.date);

    // Groups the data by City and sorts by the sum of instances per city. Only stores the number of cases.
    const cityAgg = d3.nest()
        .key(d => d.city)
        .rollup(function(leaf){
            return {
                max: d3.max(leaf, x => x.number),
                mean: d3.mean(leaf, x => x.number),
                sum: d3.sum(leaf, x => x.number)
            }
        })
        .entries(data)
        .sort((a, b) => b.value.max-a.value.max);

    // console.log(cityAgg[0])

    // The maximum number of instances at any point in the dataset
    const maxNumber = d3.max(data, d => d.number);

    // The names of all the cities in the dataset
    const allCities = cityAgg.map(d => d.key);

    // Outer parts of the plot (Title, X Label, Y Label, etc)
    const svg = d3.select("#lineplot").append("svg")
        .attr("height", figHeight)
        .attr("width", figWidth)
        .append("g")
            .attr("height", innerHeight)
            .attr('width', innerWidth)
            .attr("transform", translate(margin.left, margin.top));

    // Plot Title
    svg.append("text")
        .attr("class", "plot title")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", 25)
        .text("Growth of COVID-19 in the Netherlands");

    // Subtitle
    svg.append("text")
        .attr("class", "plot subtitle")
        .attr("x", 0)
        .attr("y", padding.top/2)
        .text("Seperated by City");

    // X axis
    svg.append("text")
        .attr("class", "plot xaxis")
        .attr("x", innerWidth/2)
        .attr("y", innerHeight)
        .text("Date");

    // Y axis
    svg.append("text")
        .attr("class", "plot yaxis")
        .attr("x", -(padding.top + height/2))
        .attr("y", -(padding.left/2))
        .attr("transform", "rotate(-90)")
        .attr("dy", "1em")
        .style('text-anchor', "middle")
        .text("Number of instances");

    /* Plot Drawing */
    
    const plot = svg.append("g")
        .attr("class", "plot")
        .attr("transform", translate(padding.left, padding.top));

    // Scale for the X axis. Maps the date to the width on the plot
    const xScale = d3.scaleTime()
        .domain([earliestDate, latestDate])
        .range([0, width])
        .nice();

    // Scale for the Y axis. Inverted range since it is drawn from top down
    const yScale = d3.scaleLinear()
        .domain([0, maxNumber])
        .range([height, 0])
        .nice();

    // Used to color the lines of the different cities according to the name of the city
    const colorScale = d3.scaleOrdinal()
        .range(d3.schemePaired)
        .domain(allCities);

    const axes = plot.append("g")
        .attr("class", "plot axes");
    
    const xAxis = axes.append("g")
        .attr("class", "plot xaxis")
        .attr("transform", translate(0, height))
        .attr("text-anchor", "middle")
        .call(d3.axisBottom(xScale)
            .ticks(d3.timeDay.every(5))
            .tickFormat(d3.timeFormat("%b %d")));

    const yAxis = axes.append("g")
        .attr("class", "plot yaxis")
        .call(d3.axisLeft(yScale));

    axes.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .ticks(5)
            .tickFormat(""));

    
    // Choose the top 5 cities with cases. Only 5 since more would be cluttered.
    let cities = allCities.slice(0, 5);

    // Store order of the cities
    let cityIndex = {};
    allCities.forEach((key, index) => cityIndex[key] = index);

    // Add the Mean value to the list of cities and make it the last index value (always at the bottom)
    cities.push("Mean");
    cityIndex['Mean'] = allCities.length;

    // Constructs a full nest of the data according the city. Stores all data.
    const fullNest = d3.nest()
        .key(d => d.city)
        .entries(data);

    const yearsNest = d3.nest()
        .key(d => d.date)
        .rollup(function(leaves) {
            return {
                date: leaves[0].date,
                mean: d3.mean(leaves, x => x.number)
            }
        })
        .entries(data)
        .map(function(d) {
            return d.value
        });

    /* Draw the lines for each city */

    const lines = plot.append("g")
        .attr("class", "lines");
        
    // Draw the lines for each city over time. Only the top 5 are shown by default.
    lines.selectAll(".line")
        .data(fullNest)
        .enter()
        .append("path")
            .attr("fill", "none")
            .attr("class", "line")
            .attr("id", d => cleanText(d.key))
            .attr("stroke", d => colorScale(d.key))
            .attr("stroke-width", 1.5)
            .attr("d", function (d) {
                return d3.line()
                    .x(d => xScale(d.date))
                    .y(d => yScale(d.number))
                    (d.values)
            })
            .style("opacity", function(d) {
                const opacity = cities.includes(d.key)? 1:0;
                return opacity;
            });

    // The line for the mean over time. Dotted grey line
    const line = lines.append("path")
        .attr("id", "Mean")
        .attr("class", "line mean")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-dasharray", ("3, 5"))
        .attr("d", d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.mean))
            (yearsNest));

    // The text for the mean line. Follows the mean line path.
    lines.append("text")
        .attr("class", "mean")
        .attr("dy", -5)
        .style("font-size", "1em")
        .style("font-family", "monospace")
        .append("textPath")
            .attr("xlink:href", "#Mean")
            .attr("startOffset", "95%")
            .text("Mean");

    /* Draw the legend for the cities */

    // The group where the legends are going to be drawn
    const legend = plot.append("g")
        .attr("class", "plot legend")
        .style("fill", "white");
    
    let tmp = legend.append("rect")
    
    drawLegend(cities, legend);    

    /* Add meta-features to the lineplot (filter, etc) */

    const lineplot = d3.select("#lineplot");

    // Create a field containing a list of all cities to choose from as filters
    const filters = lineplot.append("fieldset")
        .style("display", "inline-block")
        .style("max-height", `${figHeight}px`)
        .style("min-height", `${figHeight}px`)
        .style("vertical-align", "top")
        .style("min-width", "285px");
    
    // Legend (Label) for the fieldset
    filters.append("legend")
        .html("Cities");
    
    // Create search entry
    filters.append("input")
        .attr("type", "text")
        .attr("id", "filterSearch")
        .attr("placeholder", "Search for cities..")
        .on("keyup", () => filterSearch(d3.event.path[0]));

    // Add cities as list items that are clickable
    filters.append("ul")
        .attr("id", "lineplotFilter")
        .selectAll(".cities")
        .data(allCities.concat(['Mean']))
        .enter()
        .append("li")
            .append("a")
                .attr("class", (d) => cities.includes(d) ? "filter selected":"filter")
                .attr("href", "#")
                .on("click", clickLegend)
                .html(d => d);

    function drawLegend(entries) {
        
        const leg = legend.selectAll("plot legend values")
            .data(entries)
            .enter()
            .append("g")
                .attr("id", d => cleanText(d))
                .append("circle")
                    // .attr("id", d => cleanText(d))
                    .attr("cx", 20)
                    .attr("cy", (d, i) => 5 + i*25)
                    .attr("r", 7)
                    .style("fill", d => d ==='Mean' ? 'grey':colorScale(d))
                    .select(function(d) {
                        return this.parentNode;
                    })
                .append("text")
                    .attr("x", 40)
                    .attr("y", (d, i) => 5 + i*25)
                    .style("fill", d => d ==='Mean' ? 'grey':colorScale(d))
                    .attr("text-anchor", "left")
                    .attr("alignment-baseline", "middle")
                    .text(d => d);
            
    }

    function clickLegend(datum) {
        
        // Clean Text for ID entry. For example, no spaces or apostrophes.
        const cleanedName = cleanText(datum);
        
        // Either select the mean class (line+text) or the city id for the line
        const datumClass = cleanedName === "Mean" ? '.mean':`#${cleanedName}`;

        // Get the opposite of the current opacity and change it to that
        const currentOpacity = d3.select(datumClass).style('opacity');
        const opacity = currentOpacity == 1 ? 0:1;
        d3.selectAll(datumClass)
            .transition()
            .style("opacity", opacity);
        
        // Add or remove city from list of cities in the legend
        if (cities.includes(datum)){
            d3.select(this).classed("selected", false);
            cities = cities.filter(elem => elem!==datum);
        } else{
            d3.select(this).classed("selected", true);
            cities = cities.concat(datum);
        }
        
        // cities = cities.includes(datum) ? cities.filter(elem => elem!==datum):cities.concat(datum);

        // Resort according to index value
        cities = cities.sort((a, b) => cityIndex[a] - cityIndex[b]);
        
        // Redraw the legend
        updateLegend(cities);       
    }

    function updateLegend(entries) {

        // Transition to 0 opacity for effect (since remove cannot be transitioned to)
        const legendChildren = legend.selectAll("*");
        legendChildren.transition()
            .delay(100)
            .style("opacity", 0);

        legendChildren.remove();

        // Set opacity to 0 so items to do not immediately appear, only after transition
        legend.style("opacity", 0);

        // Redraw according for the cities provided
        drawLegend(entries);

        // Set opacity to 1 with transition
        legend.transition()
            .style("opacity", 1);
    }
    
    function filterSearch(elem) {

        // The value currently present in text entry
        const key = elem.value.toUpperCase();

        // Select the unordered list
        const list = document.getElementById("lineplotFilter");

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

}

function translate(x, y) {
    // Helper function for translate CSS
    return `translate(${x}, ${y})`
}

function cleanText(text) {

    let cleanText = text.includes("'") ? text.replace("'", ""):text;
    cleanText = cleanText.includes(" ") ? cleanText.replace(/\s+/g, "_"):cleanText;

    return cleanText;
}

function main() {

    const infectionsURL = "https://raw.githubusercontent.com/J535D165/CoronaWatchNL/master/data/rivm_corona_in_nl.csv";
    
    const data = readCSV(infectionsURL)
    data.then(data => linePlot(data, 500, 1000));


}

main()
