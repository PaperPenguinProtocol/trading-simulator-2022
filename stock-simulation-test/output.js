output = {
	g: null,
	chart: null,
	totalDaysCount: null,
	reset: () => {
		if (output.chart && "destroy" in output.chart) output.chart.destroy()
		document.getElementById("news").innerHTML = ""
		output.totalDaysCount = 0
		output.g = new Generator(testData, { initial: { priceAmplitude: 0 }, macro: { newsProbability: 0.2 } })
		output.chart = new ApexCharts(document.getElementById("chart"), {
			chart: {
				type: "line",
				height: "100%",
				animations: { enabled: false },
			},
			series: Object.entries(output.g.getCompanies()).map((company) => ({
				name: company[0],
				data: [],
			})),
			xaxis: {
				type: "datetime",
				labels: { datetimeFormatter: { month: "yyyy MMM", day: "MMM dd", hour: "dd HH:mm" }, style: { fontSize: "11px" } },
			},
			yaxis: {
				min: 0,
				forceNiceScale: true,
				labels: { formatter: (value) => ("$" + helpers.format(value)), style: { fontSize: "11px" } },
			},
			noData: { text: "No data to display", style: { fontSize: "3.6rem" } },
			legend: {
				position: "top",
				itemMargin: { horizontal: 15, vertical: 5 },
				markers: { offsetY: -1 },
				fontSize: "11px",
			},
			dataLabels: { style: { fontSize: "1.5rem" } },
			tooltip: { x: { format: "MMM dd" }, style: { fontSize: "11px" } },
			colors: [ "#f06033", "#f0bf33", "#64f033", "#33c3f0", "#6033f0", "#f033c3" ],
		})
		output.chart.render()
		console.log("Initial departments: " + Object.entries(output.g.getCompanies()).map((company) => company[0] + " (" + Object.keys(company[1].getDepartments()).join(", ") + ")").join(", "))
	},
	add: (daysCount) => {
		let historicalPrices = Object.fromEntries(Object.entries(output.g.getCompanies()).map((company) => [ company[0], [] ]))
		for (let i = 0; i < daysCount; i++) {
			const dayId = output.totalDaysCount + i
			const results = output.g.next()
			for (name in output.g.getCompanies()) {
				historicalPrices[name].push([ dayId * 1000 * 60 * 60 * 24, Math.round(results.prices[name] * 100) / 100 ])
			}
			if (results.news) {
				const newsP = document.createElement("p")
				let headline = (results.news[0] == -1 ? results.news[1] : output.g.getHeadline(results.news[0], results.news[1]))
				newsP.innerHTML = "<strong>" + dayId + "</strong> " + headline
				document.getElementById("news").appendChild(newsP)
			}
		}
		output.chart.appendData(Object.entries(historicalPrices).map((prices) => ({
			name: prices[0],
			data: prices[1],
		})))
		output.totalDaysCount += daysCount
	},
}

window.onload = output.reset
