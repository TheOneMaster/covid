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
    const nest = d3.nest()
        .key(d => d.city)
        .rollup(leaf => d3.max(leaf, x => x.number))
        .entries(data)
        .sort((a, b) => b.value-a.value);

    // The maximum number of instances at any point in the dataset
    const maxNumber = d3.max(data, d => d.number);

    // The names of all the cities in the dataset
    const allCities = nest.map(d => d.key);

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
        .text("Number of instances")

    // Plot Drawings
    
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
        .range(["#6097ce","#c57c3d","#a265c2","#72a553","#ca5572"])
        .domain(allCities);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    plot.append("g")
        .attr("class", "plot xaxis")
        .attr("transform", translate(0, height))
        .attr("text-anchor", "middle")
        .call(xAxis);

    plot.append("g")
        .attr("class", "plot yaxis")
        .call(yAxis);

    
    // Choose the top 5 cities with cases. Only 5 since more would be cluttered.
    let cities = allCities.slice(0, 5);

    // Store order of the cities
    const cityIndex = {};
    cities.forEach((key, index) => cityIndex[key] = index);

    console.log(cityIndex);

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

    // Select the 5 cities with the most cases 
    // const cityData = fullNest.filter(d => cities.includes(d.key));

    // Draw the lines for each city
    const lines = plot.append("g")
        .attr("class", "lines");
      
        
    // Draw the lines for each city over time. Only the top 5 are shown by default.
    lines.selectAll(".line")
        .data(fullNest)
        .enter()
        .append("path")
            .attr("fill", "none")
            .attr("id", d => d.key)
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
                return opacity
            });

    // The line for the mean over time. Dotted grey line
    lines.append("path")
        .attr("id", "Mean")
        .attr("class", "mean")
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
            .text("Mean")

    

    // Draw the legend dot for each city

    const legend = plot.append("g")
        .attr("class", "plot legend")

    cities.push("Mean");
    cityIndex['Mean'] = 6;

    createCheckboxes(cities);

    drawLegend(cities, legend);
    legend.style("opacity", 1)

    function createCheckboxes(entries) {
        
        const lineplot = d3.select("#lineplot");

        /*
        Create a div for each checkbox. In the div there is a checkbox and a label.
        The label name is the name of the elem that is being iterated over from the entries.
        Both the label and the checkbox have the class "checkbox" and the checkbox id is
        "check_{elem_name}."
        */
        
        const checkboxes = lineplot.append("fieldset")
            .append("legend")
                .html("Cities")
                .select(function() {return this.parentNode})
            .style("vertical-align", "top")
            .style("margin", `${margin.top}px`)
            .style("padding", `${padding.top}px 0`)
            .style("display", "inline-block")
            .attr("id", "checkboxes")
            .selectAll(".check")
            .data(entries)
            .enter()
            .append("div")
                .style("display", "block")
                .append("input")
                    .attr("id", d => `check_${d}`)
                    .attr("class", "checkbox")
                    .attr("type", "checkbox")
                    .attr("checked", true)
                    .on("change", clickLegend)
                    .select( function() {return this.parentNode})
                .append("label")
                    .attr("width", 80)
                    .attr("class", "checkbox")
                    .attr("for", d => `check_${d}`)
                    .html(d => d); 
                    
        return checkboxes;
    }

    function drawLegend(entries, group) {

        group.style("opacity", 0);
        
        const leg = group.selectAll("plot legend values")
            .data(entries)
            .enter()
            .append("g")
                .append("circle")
                    .attr("id", d => d.key)
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
        
        const datumClass = datum === "Mean" ? '.mean':`#${datum}`;
        const currentOpacity = d3.select(datumClass).style('opacity');
        const opacity = currentOpacity == 1 ? 0:1

        d3.selectAll(datumClass).transition().style("opacity", opacity);
        
        cities = cities.includes(datum) ? cities.filter(elem => elem!==datum):cities.concat(datum);
        let cityWithIndex = cities.map((elem) => [elem, cityIndex[elem]]);

        cityWithIndex = cityWithIndex.sort((a, b) => a[1] - b[1]);
        cities = cityWithIndex.map((elem) => elem[0]);
        
        updateLegend(cities);       
    }

    function updateLegend(entries) {

        const legendChildren = legend.selectAll("*");
        legendChildren.transition()
            .delay(100)
            .style("opacity", 0);

        legendChildren.remove();

        drawLegend(entries, legend);

        legend.transition()
            .style("opacity", 1);
    }

    function translate(x, y) {
        // Helper function for translate CSS
        return `translate(${x}, ${y})`
    }
}

function main() {

    const infectionsURL = "https://raw.githubusercontent.com/J535D165/CoronaWatchNL/master/data/rivm_corona_in_nl.csv";
    
    readCSV(infectionsURL).then(d => linePlot(d, 500, 1000));
}

main()
