class Game {
	#timeout
	#elements
	#chart
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

	#write() {
		this.#elements.portfolio.innerHTML = ""
		let rows = []
		const lastPrices = this.#g.getLastPrices()
		let totalValue = this.#cash
		for (let i = 0; i < testData.companies.length; i++) {
			const v = this.#stocks[i] * lastPrices[i]
			totalValue += v
			rows.push([ testData.companies[i], this.#stocks[i], v ])
		}
		rows.push([ "Cash", "", this.#cash ])
		this.#elements.portfolioTotal.innerHTML = "$" + Math.round(totalValue * 100) / 100
		for (let i = 0; i < rows.length; i++) {
			const rowEl = document.createElement("tr")
			for (let j = 0; j < 3; j++) {
				const cellEl = document.createElement("td")
				cellEl.innerHTML = (j == 2 ? "$" : "") + (j == 0 || rows[i][j] == "" ? rows[i][j] : Math.round(rows[i][j] * 100) / 100)
				rowEl.appendChild(cellEl)
			}
			this.#elements.portfolio.appendChild(rowEl)
		}
	}

	#post() {
		const n = this.#g.getLastNews()
		if (n) {
			const newsP = document.createElement("p")
			newsP.innerHTML = "(" + (this.#g.getHistoryLength() - 1) + ") " + testData.events[n[0]].names[n[1]]
			this.#elements.news.appendChild(newsP)
			this.#elements.news.scrollTop = this.#elements.news.scrollHeight
		}
	}

	#draw() {
		if (this.#chart && "destroy" in this.#chart) this.#chart.destroy()
		const config = {
			type: "line",
			data: {
				labels: Array.from(new Array(this.#g.getHistoryLength()), (value, index) => index).slice(-1000),
				datasets: testData.companies.map((name, index) => ({
					label: name,
					borderColor: helpers.color(index / testData.companies.length),
					data: this.#g.getPriceHistory(index).slice(-1000),
				})),
			},
			options: {
				scales: { y: { min: 0 } },
				animation: false,
				aspectRatio: 1.5,
				spanGaps: true,
				elements: { point: { radius: 0 } },
			},
		}
		this.#chart = new Chart(this.#elements.chart, config)
	}

	#tick() {
		this.#g.next()
		this.#write()
		this.#post()
		this.#draw()
		this.#timeout = setTimeout(this.#tick.bind(this), 2000)
	}

	restart() {
		clearTimeout(this.#timeout)
		if (this.#chart && "destroy" in this.#chart) this.#chart.destroy()
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
		this.#elements.news.innerHTML = "<p>NEWS</p>"
		this.#cash = 1000
		this.#stocks = Array.from(testData.companies, (value, index) => 0)
		this.#g = new Generator(testData, 0.2, true)
		this.#tick()
	}

	getSelectedCompany() {
		const select = this.#elements.companies
		return parseInt(select.options[select.selectedIndex].value)
	}

	transact(shares) {
		const i = this.getSelectedCompany()
		this.#cash -= shares * this.#g.getLastPrices()[i]
		this.#stocks[i] += shares
		this.#write()
	}

	close() {
		const i = this.getSelectedCompany()
		this.#cash += this.#stocks[i] * this.#g.getLastPrices()[i]
		this.#stocks[i] = 0
		this.#write()
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
