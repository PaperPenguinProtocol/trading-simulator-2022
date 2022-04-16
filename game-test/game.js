class Game {
	#data
	#state
	#frequency
	#timeout
	#elements
	#epoch
	#chart
	#scale
	#portfolio
	#averages
	#g

	constructor(data, elements) {
		this.#data = data
		this.#state = "waiting"
		this.#elements = elements
		this.#portfolio = new Portfolio(this.#data.companyNames)
		this.#portfolio.addCash(10000)
		this.#averages = Object.fromEntries(this.#data.companyNames.map((name) => [ name, 0 ]))
		for (let i = 0; i < this.#data.companyNames.length; i++) {
			const c = document.createElement("option")
			c.value = this.#data.companyNames[i]
			c.innerHTML = this.#data.companyNames[i]
			if (i == 0) c.selected = true
			this.#elements.companies.appendChild(c)
		}
		this.#frequency = Math.pow(10, this.#elements.frequency.value)
		this.#elements.frequency.oninput = (event) => {
			this.#frequency = Math.pow(10, event.target.value)
		}
	}

	getTotalAssetValue() {
		return this.#portfolio.getTotalAssetValue(this.#g.getLastPrices())
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
		this.#elements.portfolioTotal.innerHTML = "$" + helpers.format(this.getTotalAssetValue())
	}

	#addRowsToPortfolio(rows, stocks = false) {
		for (let i = 0; i < rows.length; i++) {
			const rowEl = document.createElement("tr")
			for (let j = 0; j < 4; j++) {
				const cellEl = document.createElement("td")
				cellEl.innerHTML = ((j == 1 && rows[i][j] != "") || j == 3 ? "$" + helpers.format(rows[i][j]) : rows[i][j])
				if (stocks && j == 1) {
					const previousPrice = (this.#g.getTick() == 0 ? rows[i][j] : this.#g.getCompanies()[rows[i][0]].getPriceHistory().at(-2))
					cellEl.classList.add(previousPrice == rows[i][j] ? "primary" : (previousPrice < rows[i][j] ? "success" : "danger"))
				}
				rowEl.appendChild(cellEl)
			}
			this.#elements.portfolio.appendChild(rowEl)
		}
	}

	#updatePortfolio() {
		this.#elements.portfolioTotal.innerHTML = "$" + helpers.format(this.getTotalAssetValue())
		let stockRows = []
		const lastPrices = this.#g.getLastPrices()
		for (const name in this.#g.getCompanies()) {
			const shares = this.#portfolio.getStocks()[name]
			stockRows.push([ name, lastPrices[name], shares, lastPrices[name] * shares ])
		}
		let otherRows = [ [ "Cash", "", "", this.#portfolio.getCash() ] ]
		this.#resetPortfolio()
		this.#addRowsToPortfolio(stockRows, true)
		this.#addRowsToPortfolio(otherRows)
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
		for (name in this.#g.getCompanies()) {
			const departments = this.#g.getCompanies()[name].getDepartments()
			const sapStrings = []
			for (const sectorName in departments) {
				const announcedProducts = Object.values(departments[sectorName].getProducts(true))
				const developedCount = announcedProducts.filter((product) => (product.progress == 1)).length
				const undevelopedCount = announcedProducts.length - developedCount
				let s = " " + sectorName + " (" + developedCount + " in production"
				if (undevelopedCount > 0) s += " and " + undevelopedCount + " announced"
				s += ")"
				sapStrings.push(s)
			}
			const sapP = document.createElement("p")
			sapP.innerHTML = "<strong>" + name + "</strong>:" + sapStrings.join(",")
			this.#elements.sectorsAndProducts.appendChild(sapP)
		}
	}

	#resetChart() {
		if (this.#chart && "destroy" in this.#chart) this.#chart.destroy()
	}

	#updateChart() {
		this.#chart.appendData(Object.entries(this.#g.getLastPrices()).map((price) => ({
			name: price[0],
			data: [ [ this.#timestamp(), Math.round(price[1] * 100) / 100 ] ],
		})))
		this.#zoomChart()
	}

	#tick(next = true) {
		if (next) this.#g.next()
		if (this.#portfolio.getCash() < 0) this.#portfolio.applyInterestRate(this.#g.getInterestRate())
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
			series: this.#data.companyNames.map((company) => ({
				name: company,
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
		this.#portfolio = new Portfolio(this.#data.companyNames)
		this.#portfolio.addCash(10000)
		this.#averages = Object.fromEntries(this.#data.companyNames.map((name) => [ name, 0 ]))
		this.#g = new Generator(this.#data, { initial: { priceAmplitude: 0 }, macro: { newsProbability: 0.2 } })
		this.#tick(false)
	}

	getSelectedCompany() {
		const select = this.#elements.companies
		return select.options[select.selectedIndex].value
	}

	transact(shares) {
		if (shares == 0) return
		const name = this.getSelectedCompany()
		const price = this.#g.getLastPrices()[name]
		this.#portfolio.transactStock(name, shares, price)
		this.#updatePortfolio()
		if (this.#averages[name] != 0) this.#chart.removeAnnotation("average-" + name)
		if (this.#portfolio.getStocks()[name] == 0) this.#averages[name] = 0
		else this.#averages[name] = ((this.#portfolio.getStocks()[name] - shares) * this.#averages[name] + shares * price) / this.#portfolio.getStocks()[name]
		if (this.#averages[name] != 0) this.#chart.addYaxisAnnotation({
			id: "average-" + name,
			y: this.#averages[name],
			label: {
				text: name + " average $" + helpers.format(this.#averages[name]),
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
		this.transact(-this.#portfolio.getStocks()[this.getSelectedCompany()])
	}
}

window.onload = () => {
	game = new Game(
		testData,
		{
			frequency: document.getElementById("frequency"),
			companies: document.getElementById("companies"),
			chart: document.getElementById("chart"),
			portfolioTotal: document.getElementById("portfolioTotal"),
			portfolio: document.getElementById("portfolio"),
			news: document.getElementById("news"),
			sectorsAndProducts: document.getElementById("sectorsAndProducts"),
		},
	)
}
