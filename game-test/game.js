class Game {
	#data
	#state
	#frequency
	#timeout
	#elements
	#epoch
	#chart
	#scale
	#assets
	#g

	constructor(data, companiesEl, chartEl, portfolioTotalEl, portfolioEl, newsEl, sectorsAndProductsEl) {
		this.#data = data
		this.#state = "waiting"
		this.#elements = {
			companies: companiesEl,
			chart: chartEl,
			portfolioTotal: portfolioTotalEl,
			portfolio: portfolioEl,
			news: newsEl,
			sectorsAndProducts: sectorsAndProductsEl,
		}
		this.#assets = { cash: 10000, stocks: [], averages: [] }
		for (let i = 0; i < this.#data.companies.length; i++) {
			const c = document.createElement("option")
			c.value = i
			c.innerHTML = this.#data.companies[i]
			if (i == 0) c.selected = true
			this.#elements.companies.appendChild(c)
		}
	}

	#timestamp() {
		return this.#epoch + 1000 * 60 * 60 * 24 * this.#g.getTick()
	}

	#zoomChart() {
		const timestamp = this.#timestamp()
		this.#chart.zoomX(this.#epoch + (timestamp - this.#epoch) * this.#scale, timestamp)
	}

	#resetPortfolio() {
		this.#elements.portfolio.innerHTML = ""
	}

	#resetPortfolioTotal() {
		this.#elements.portfolioTotal.innerHTML = "$" + helpers.format(this.#assets.cash)
	}

	#updatePortfolio() {
		let rows = []
		const lastPrices = this.#g.getLastPrices()
		let totalValue = this.#assets.cash
		for (let i = 0; i < this.#g.getCompanyNames().length; i++) {
			const v = this.#assets.stocks[i] * lastPrices[i]
			totalValue += v
			rows.push([ this.#g.getCompanyNames()[i], lastPrices[i], this.#assets.stocks[i], v ])
		}
		rows.push([ "Cash", "", "", this.#assets.cash ])
		this.#elements.portfolioTotal.innerHTML = "$" + helpers.format(totalValue)
		this.#resetPortfolio()
		for (let i = 0; i < rows.length; i++) {
			const rowEl = document.createElement("tr")
			for (let j = 0; j < 4; j++) {
				const cellEl = document.createElement("td")
				cellEl.innerHTML = ((j == 1 && i < rows.length - 1) || j == 3 ? "$" + helpers.format(rows[i][j]) : rows[i][j])
				if (j == 1 && i < rows.length - 1) {
					const previousPrice = (this.#g.getTick() == 0 ? rows[i][j] : this.#g.getPriceHistory(i).at(-2))
					cellEl.classList.add(previousPrice == rows[i][j] ? "primary" : (previousPrice < rows[i][j] ? "success" : "danger"))
				}
				rowEl.appendChild(cellEl)
			}
			this.#elements.portfolio.appendChild(rowEl)
		}
	}

	#resetNews() {
		this.#elements.news.innerHTML = "<p><strong>NEWS</strong></p>"
	}

	#updateNews() {
		const n = this.#g.getLastNews()
		if (n) {
			const newsP = document.createElement("p")
			const dateObj = new Date(this.#timestamp())
			let date = dateObj.getFullYear() + " "
			date += dateObj.toLocaleString("en-US", { month: "short" }) + " "
			date += helpers.pad(dateObj.getDate(), 2)
			date += " (" + this.#g.getTick() + ")"
			let headline
			if (n[0] == -1) headline = n[1]
			else headline = this.#g.getHeadline(n[0], n[1])
			newsP.innerHTML = "<strong>" + date + "</strong> " + headline
			this.#elements.news.appendChild(newsP)
			if (this.#elements.news.scrollTop > this.#elements.news.scrollHeight - this.#elements.news.offsetHeight - 100) {
				this.#elements.news.scrollTop = this.#elements.news.scrollHeight
			}
		}
	}

	#resetSectorsAndProducts() {
		this.#elements.sectorsAndProducts.innerHTML = ""
	}

	#updateSectorsAndProducts() {
		this.#elements.sectorsAndProducts.innerHTML = "<p><strong>SECTORS (PRODUCTS)</strong></p>"
		for (let i = 0; i < this.#g.getCompanyNames().length; i++) {
			const sap = this.#g.getSectorsAndProducts(i)
			const sapStrings = []
			for (const sectorName in sap) {
				let s = " " + sectorName
				if (sap[sectorName].length > 0) {
					s += " ("
					const minorCount = sap[sectorName].filter((product) => (product < 100000)).length
					const majorCount = sap[sectorName].length - minorCount
					if (minorCount > 0) s += minorCount + " minor"
					if (minorCount > 0 && majorCount > 0) s += ", "
					if (majorCount > 0) s += majorCount + " major"
					s += ")"
				}
				sapStrings.push(s)
			}
			const sapP = document.createElement("p")
			sapP.innerHTML = "<strong>" + this.#g.getCompanyNames()[i] + "</strong>" + (sapStrings.length > 0 ? ":" : "") + sapStrings.join(",")
			this.#elements.sectorsAndProducts.appendChild(sapP)
		}
	}

	#resetChart() {
		if (this.#chart && "destroy" in this.#chart) this.#chart.destroy()
	}

	#updateChart() {
		this.#chart.appendData(this.#g.getLastPrices().map((price) => ({
			data: [ [ this.#timestamp(), Math.round(price * 100) / 100 ] ],
		})))
		this.#zoomChart()
	}

	#tick(next = true) {
		if (next) this.#g.next()
		this.#updatePortfolio()
		this.#updateNews()
		this.#updateSectorsAndProducts()
		this.#updateChart()
		this.#timeout = setTimeout(this.#tick.bind(this), this.#frequency)
	}

	stop() {
		clearTimeout(this.#timeout)
		this.#state = "waiting"
		this.#resetPortfolio()
		this.#resetPortfolioTotal()
		this.#resetNews()
		this.#resetSectorsAndProducts()
		this.#resetChart()
	}

	start(initialFrequency = 1000) {
		if (this.#state == "playing") this.stop()
		this.#state = "playing"
		this.#frequency = initialFrequency
		this.#epoch = Date.now()
		this.#resetNews()
		this.#chart = new ApexCharts(this.#elements.chart, {
			chart: {
				type: "line",
				height: "100%",
				animations: { enabled: false },
				toolbar: { show: false },
				zoom: { enabled: false },
				selection: { fill: { color: "#fff" }, stroke: { color: "#fff" } },
				background: "transparent",
				foreColor: "#fff",
			},
			series: this.#data.companies.map((name, index) => ({
				name,
				data: [],
			})),
			xaxis: {
				type: "datetime",
				labels: { datetimeFormatter: { month: "yyyy MMM", day: "MMM dd", hour: "dd HH:mm" }, style: { fontSize: "11px" } },
				axisBorder: { color: "#888" },
				axisTicks: { color: "#888" },
			},
			yaxis: {
				min: 0,
				forceNiceScale: true,
				labels: { formatter: (value) => ("$" + helpers.format(value)), style: { fontSize: "11px" } },
				axisBorder: { color: "#888" },
				axisTicks: { color: "#888" },
				crosshairs: { stroke: { color: "555" } },
			},
			noData: { text: "No data to display", style: { fontSize: "3.6rem" } },
			annotations: { position: "front" },
			stroke: { curve: "smooth" },
			legend: {
				position: "top",
				itemMargin: { horizontal: 15, vertical: 5 },
				markers: { offsetY: -1 },
				fontSize: "11px",
			},
			dataLabels: { style: { fontSize: "1.5rem" } },
			tooltip: { x: { format: "MMM dd" }, style: { fontSize: "11px" } },
			grid: { borderColor: "#888" },
			markers: { strokeColors: "#333" },
			colors: [ "#f06033", "#f0bf33", "#64f033", "#33c3f0", "#6033f0", "#f033c3" ],
			theme: { mode: "dark" },
		})
		this.#chart.render()
		this.#scale = 0.2
		this.#elements.chart.onwheel = (event) => {
			this.#scale = Math.max(0.0001, Math.min(0.9999, this.#scale - 0.0002 * event.deltaY))
			this.#zoomChart()
		}
		this.#assets.stocks = Array(this.#data.companies.length).fill(0)
		this.#assets.averages = Array(this.#data.companies.length).fill(0)
		this.#g = new Generator(this.#data, 0.2, true)
		this.#tick(false)
	}

	getSelectedCompany() {
		const select = this.#elements.companies
		return parseInt(select.options[select.selectedIndex].value)
	}

	transact(shares) {
		if (shares == 0) return
		const i = this.getSelectedCompany()
		const price = this.#g.getLastPrices()[i]
		this.#assets.cash -= shares * price
		this.#assets.stocks[i] += shares
		this.#updatePortfolio()
		if (this.#assets.averages[i] != 0) this.#chart.removeAnnotation("average-" + i)
		if (this.#assets.stocks[i] == 0) this.#assets.averages[i] = 0
		else this.#assets.averages[i] = ((this.#assets.stocks[i] - shares) * this.#assets.averages[i] + shares * price) / this.#assets.stocks[i]
		if (this.#assets.averages[i] != 0) this.#chart.addYaxisAnnotation({
			id: "average-" + i,
			y: this.#assets.averages[i],
			label: {
				text: this.#g.getCompanyNames()[i] + " average $" + helpers.format(this.#assets.averages[i]),
				textAnchor: "start",
				position: "left",
				borderColor: "#fff",
				style: { background: "#333", color: "#fff", fontSize: "11px" },
			},
			strokeDashArray: 10,
			borderColor: "#fff",
			fillColor: "#fff",
		})
	}

	close() {
		this.transact(-this.#assets.stocks[this.getSelectedCompany()])
	}
}

window.onload = () => {
	game = new Game(
		testData,
		document.getElementById("companies"),
		document.getElementById("chart"),
		document.getElementById("portfolioTotal"),
		document.getElementById("portfolio"),
		document.getElementById("news"),
		document.getElementById("sectorsAndProducts"),
	)
}
