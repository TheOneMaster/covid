'use strict'

function readCSV(file) {
    
    const timeParse = d3.timeParse("%Y-%m-%d");

    d3.csv(file, function (d) {
        if (d.Gemeentenaam != ""){
            return {
                Date: timeParse(d.Datum),
                City: d.Gemeentenaam,
                CityCode: +d.Gemeentecode,
                Province: d.Provincienaam,
                Number: +d.Aantal
            }
        }
        
    }).then(data => linePlot(data));
}

function linePlot(data) {

    const figHeight = 500;
    const figWidth = 1000;

    const margin = {top:20, bottom:20, left:20, right:20};
    const padding = {top:40, bottom:40, left:40, right:20};

    const innerHeight = figHeight - (margin.top + margin.bottom);
    const innerWidth = figWidth - (margin.left + margin.right);

    const height = innerHeight - (padding.top + padding.bottom);
    const width = innerWidth - (padding.left + padding.right);

    const latestDate = d3.max(data, d => d.Date);
    const earliestDate = d3.min(data, d => d.Date);

    const nest = d3.nest()
        .key(d => d.City)
        .rollup(leaf => d3.sum(leaf, x => x.Number))
        .entries(data)
        .sort((a, b) => b.value-a.value);

    const maxNumber = d3.max(data, d => d.Number);
    const allCities = nest.map(d => d.key);

    // Outer parts of the plot (Title, X Label, Y Label, etc)
    const svg = d3.select("#lineplot").append("svg")
        .attr("height", figHeight)
        .attr("width", figWidth)
        .append("g")
            .attr("height", innerHeight)
            .attr('width', innerWidth)
            .attr("transform", translate(margin.left, margin.top));

    svg.append("text")
        .attr("class", "plot title")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", 25)
        .text("Growth of COVID-19 in the Netherlands");

    svg.append("text")
        .attr("class", "plot subtitle")
        .attr("x", 0)
        .attr("y", padding.top/2)
        .text("Seperated by City");

    svg.append("text")
        .attr("class", "plot xaxis")
        .attr("x", innerWidth/2)
        .attr("y", innerHeight)
        .text("Date");

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

    
    const xScale = d3.scaleTime()
        .domain([earliestDate, latestDate])
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, maxNumber])
        .range([height, 0])
        .nice();

    const colorScale = d3.scaleOrdinal()
        .range(d3.schemeSet2)
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

    
    const cities = allCities.slice(0, 5);
    const city = allCities[0];

    const fullNest = d3.nest()
        .key(d => d.City)
        .entries(data);

    const cityData = fullNest.filter(d => cities.includes(d.key));

    const line = plot.append("g")
        .selectAll(".line")
        .data(cityData)
        .enter()
        .append("path")
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d.key))
            .attr("stroke-width", 1.5)
            .attr("d", function (d){
                return d3.line()
                    .x(d => xScale(d.Date))
                    .y(d => yScale(d.Number))
                    (d.values)
            })

    plot.selectAll("plot legend dot").append("g")
        .attr("class", "plot legend")
        .data(cities)
        .enter()
        .append("circle")
            .attr("cx", 20)
            .attr("cy", (d, i) => 20 + i*20)
            .attr("r", 7)
            .style("fill", d => colorScale(d));

    plot.selectAll("plot legend text").append("g")
        .data(cities)
        .enter()
        .append("text")
            .attr("x", 40)
            .attr("y", (d, i) => 20 + i*20)
            .style("fill", d => colorScale(d))
            .style("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .text(d => d);

    

    function translate(x, y) {
        return `translate(${x}, ${y})`
    }

}

function main() {

    const data_url = "https://raw.githubusercontent.com/J535D165/CoronaWatchNL/master/data/rivm_corona_in_nl.csv";
    readCSV(data_url);
}

main()
