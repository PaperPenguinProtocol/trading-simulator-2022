class Game {
	#frequency
	#timeout
	#elements
	#epoch
	#chart
	#scale
	#averages
	#cash
	#stocks
	#g

	constructor(companiesEl, chartEl, portfolioTotalEl, portfolioEl, newsEl) {
		this.#elements = {
			companies: companiesEl,
			chart: chartEl,
			portfolioTotal: portfolioTotalEl,
			portfolio: portfolioEl,
			news: newsEl,
		}
	}

	#timestamp() {
		return this.#epoch + 1000 * 60 * 60 * 24 * this.#g.getHistoryLength()
	}

	#zoom() {
		const timestamp = this.#timestamp()
		this.#chart.zoomX(this.#epoch + (timestamp - this.#epoch) * this.#scale, timestamp)
	}

	#write() {
		this.#elements.portfolio.innerHTML = ""
		let rows = []
		const lastPrices = this.#g.getLastPrices()
		let totalValue = this.#cash
		for (let i = 0; i < testData.companies.length; i++) {
			const v = this.#stocks[i] * lastPrices[i]
			totalValue += v
			rows.push([ testData.companies[i], lastPrices[i], this.#stocks[i], v ])
		}
		rows.push([ "Cash", "", "", this.#cash ])
		this.#elements.portfolioTotal.innerHTML = "$" + helpers.format(totalValue)
		for (let i = 0; i < rows.length; i++) {
			const rowEl = document.createElement("tr")
			for (let j = 0; j < 4; j++) {
				const cellEl = document.createElement("td")
				cellEl.innerHTML = ((j == 1 && i < rows.length - 1) || j == 3 ? "$" + helpers.format(rows[i][j]) : rows[i][j])
				if (j == 1 && i < rows.length - 1) {
					const previousPrice = this.#g.getHistoryLength() == 1 ? rows[i][j] : this.#g.getPriceHistory(i).at(-2)
					cellEl.classList.add(previousPrice == rows[i][j] ? "primary" : (previousPrice < rows[i][j] ? "success" : "danger"))
				}
				rowEl.appendChild(cellEl)
			}
			this.#elements.portfolio.appendChild(rowEl)
		}
	}

	#post() {
		const n = this.#g.getLastNews()
		if (n) {
			const newsP = document.createElement("p")
			const dateObj = new Date(this.#timestamp())
			let date = dateObj.getFullYear() + " "
			date += dateObj.toLocaleString("default", { month: "short" }) + " "
			date += helpers.pad(dateObj.getDate(), 2)
			date += " (" + (this.#g.getHistoryLength() - 1) + ")"
			let headline
			if (n[0] == -1) headline = n[1]
			else headline = testData.events[n[0]].names[n[1]]
			newsP.innerHTML = "<strong>" + date + "</strong> " + headline
			this.#elements.news.appendChild(newsP)
			if (this.#elements.news.scrollTop > this.#elements.news.scrollHeight - this.#elements.news.offsetHeight - 100) {
				this.#elements.news.scrollTop = this.#elements.news.scrollHeight
			}
		}
	}

	#draw() {
		this.#chart.appendData(this.#g.getLastPrices().map((price) => ({ data: [ [ this.#timestamp(), price ] ] })))
		this.#zoom()
	}

	#tick(next = true) {
		if (next) this.#g.next()
		this.#write()
		this.#post()
		this.#draw()
		this.#timeout = setTimeout(this.#tick.bind(this), this.#frequency)
	}

	restart(initialFrequency = 1000) {
		clearTimeout(this.#timeout)
		if (this.#chart && "destroy" in this.#chart) this.#chart.destroy()
		this.#chart = new ApexCharts(this.#elements.chart, {
			chart: {
				type: "line",
				height: "100%",
				animations: { enabled: false },
				toolbar: { show: false },
				zoom: { enabled: false },
				background: "transparent",
				foreColor: "#fff",
			},
			series: testData.companies.map((name, index) => ({
				name,
				data: [],
			})),
			xaxis: { type: "datetime" },
			yaxis: { min: 0, decimalsInFloat: 2, forceNiceScale: true },
			noData: { text: "No data to display" },
			annotations: { position: "front" },
			stroke: { curve: "smooth" },
			legend: { itemMargin: { horizontal: 15, vertical: 5 } },
			grid: { borderColor: "#888" },
			colors: [ "#f06033", "#f0bf33", "#64f033", "#33c3f0", "#6033f0", "#f033c3" ],
			theme: { mode: "dark" },
		})
		this.#chart.render()
		this.#scale = 0.2
		this.#elements.chart.onwheel = (event) => {
			this.#scale = Math.max(0.0001, Math.min(0.9999, this.#scale - 0.0002 * event.deltaY))
			this.#zoom()
		}
		this.#elements.companies.innerHTML = ""
		for (let i = 0; i < testData.companies.length; i++) {
			const c = document.createElement("option")
			c.value = i
			c.innerHTML = testData.companies[i]
			if (i == 0) c.selected = true
			this.#elements.companies.appendChild(c)
		}
		this.#elements.portfolioTotal.innerHTML = "$0"
		this.#elements.portfolio.innerHTML = ""
		this.#elements.news.innerHTML = "<p><strong>NEWS</strong></p>"
		this.#epoch = Date.now()
		this.#averages = testData.companies.map((name) => 0)
		this.#cash = 10000
		this.#stocks = Array.from(testData.companies, (value, index) => 0)
		this.#g = new Generator(testData, 0.2, true)
		this.#frequency = initialFrequency
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
		this.#cash -= shares * price
		this.#stocks[i] += shares
		this.#write()
		if (this.#averages[i] != 0) this.#chart.removeAnnotation("average-" + i)
		if (this.#stocks[i] == 0) this.#averages[i] = 0
		else this.#averages[i] = ((this.#stocks[i] - shares) * this.#averages[i] + shares * price) / this.#stocks[i]
		if (this.#averages[i] != 0) this.#chart.addYaxisAnnotation({
			id: "average-" + i,
			y: this.#averages[i],
			label: {
				text: testData.companies[i] + " average ($" + helpers.format(this.#averages[i]) + ")",
				style: { background: "#333", color: "#fff" },
			},
			strokeDashArray: 10,
			borderColor: "#fff",
			fillColor: "#fff",
		})
	}

	close() {
		this.transact(-this.#stocks[this.getSelectedCompany()])
	}
}

window.onload = () => {
	game = new Game(
		document.getElementById("companies"),
		document.getElementById("chart"),
		document.getElementById("portfolioTotal"),
		document.getElementById("portfolio"),
		document.getElementById("news"),
	)
}
