helpers = {
	sign: () => (Math.round(Math.random()) * 2 - 1),
	multiply: (ratio, exponent = 1, probability = 0.5) => {
		const multiplier = Math.pow(Math.random(), exponent) * ratio + 1
		if (Math.random() < probability) return multiplier
		return 1 / multiplier
	},
	add: (exponent = 1, probability = 0.5) => {
		const multiplier = helpers.multiply(1, exponent, probability)
		if (multiplier > 1) return multiplier - 1
		return 2 * (multiplier - 1)
	},
	remove: (arr, value) => {
		arr.splice(arr.indexOf(value), 1)
	},
	pad: (integer, count) => ("0".repeat(count - integer.toString().length) + integer),
	format: (amount) => {
		const sign = (amount < 0 ? "-" : "")
		const hundredfold = Math.round(Math.abs(amount) * 100)
		let whole = Math.floor(hundredfold / 100)
		let string = "." + helpers.pad(hundredfold - 100 * whole, 2)
		if (whole == 0) return sign + "0" + string
		while (whole > 0) {
			nextWhole = Math.floor(whole / 1000)
			string = " " + (nextWhole > 0 ? helpers.pad(whole % 1000, 3) : whole % 1000) + string
			whole = nextWhole
		}
		return sign + string.slice(1)
	},
}

class Markov {
	#states
	#currentState

	constructor(states, initialState) {
		this.#states = states
		this.#currentState = initialState
	}

	iterate() {
		const result = Math.random()
		let value = 0
		const cur = this.#states[this.#currentState]
		for (let i = 0; i < cur.length; i++) {
			value += cur[i][1]
			if (result <= Math.round(value * 1000000) / 1000000) {
				this.#currentState = cur[i][0]
				return cur[i][0]
			}
		}
	}
}

class Company {
	#pressure
	#priceHistory
	#sectors
	#employeesCount
	#cash
	#reports
	#fixedCosts
	#revenueSources

	constructor(initialPressure, initialPrice, initialSectors, initialEmployeesCount, initialCash, initialFixedCosts, initialRevenueSources) {
		this.#pressure = initialPressure
		this.#priceHistory = [ initialPrice ]
		this.#sectors = initialSectors
		this.#employeesCount = initialEmployeesCount
		this.#cash = initialCash
		this.#reports = [ { tick: 0, cash: initialCash } ]
		this.#fixedCosts = initialFixedCosts
		this.#revenueSources = initialRevenueSources
	}

	getPressure() {
		return this.#pressure
	}

	addPressure(pressureDiff) {
		this.#pressure += pressureDiff
	}

	getPriceHistory() {
		return this.#priceHistory
	}

	addPrice(price) {
		if (price <= 0) throw price.toString()
		this.#priceHistory.push(price)
	}

	getSectors() {
		return this.#sectors
	}

	addSector(sectorName) {
		if (!this.#sectors.includes(sectorName)) this.#sectors.push(sectorName)
	}

	removeSector(sectorName) {
		if (this.#sectors.includes(sectorName)) {
			helpers.remove(this.#sectors, sectorName)
			this.#revenueSources = this.#revenueSources.filter((source) => (source[0] != sectorName))
		}
	}

	getEmployeesCount() {
		return this.#employeesCount
	}

	employ(employeesCountDiff) {
		this.#employeesCount += Math.min(2 - this.#employeesCount, employeesCountDiff)
	}

	getCash() {
		return this.#cash
	}

	getReports() {
		return this.#reports
	}

	addReport() {
		this.#reports.push({
			tick: this.#priceHistory.length - 1,
			cash: this.getCash(),
		})
	}

	getFixedCosts() {
		return this.#fixedCosts
	}

	multiplyFixedCosts(fixedCostsCoeff) {
		this.#fixedCosts *= fixedCostsCoeff
	}

	spend() {
		this.#cash -= this.#fixedCosts * helpers.multiply(0.1)
		this.#cash -= this.#employeesCount * 100 * helpers.multiply(0.1)
	}

	getRevenueSources() {
		return this.#revenueSources
	}

	addRevenueSource(sectorName, revenue) {
		this.#revenueSources.push([ sectorName, revenue ])
	}

	earn() {
		const revenue = this.#revenueSources.reduce((prevValue, curValue) => (
			prevValue + curValue[1] * (Math.random() - 0.4)
		), 0)
		this.#cash += revenue
	}
}

class Generator {
	#data
	#newsProbability
	#companies
	#chains
	#newsHistory

	constructor(data, newsProbability = 1, fixedInitialPrice = false) {
		this.#data = data
		this.#newsProbability = newsProbability
		this.#companies = this.#data.companies.map((name) => (new Company(
			0,
			fixedInitialPrice ? 100 : Math.random() * 90 + 10,
			[ "gaming" ],
			Math.floor(Math.pow(Math.random(), 5) * 10000) + 10,
			Math.pow(Math.random(), 0.5) * 100000 + 1000,
			Math.random() * 10 + 100,
			[ [ "gaming", Math.random() * 1000 + 100 ] ],
		)))
		this.#chains = this.#data.events.map((chain) => (new Markov(chain.transitions, 0)))
		this.#newsHistory = [ null ]
	}

	getTick() {
		return this.#newsHistory.length - 1
	}

	getLastPrices() {
		return this.#data.companies.map((name, index) => (this.#companies[index].getPriceHistory().at(-1)))
	}

	getLastNews() {
		return this.#newsHistory.at(-1)
	}

	getPriceHistory(i) {
		return this.#companies[i].getPriceHistory()
	}

	#applyNews(i) {
		const n = this.getLastNews()
		if (!n || n[0] == -1) return 0
		const company = this.#companies[i]
		const c = this.#data.events[n[0]].consequences[n[1]]
		let newsC = 0
		const sectors = company.getSectors()
		const initialSectorsCount = sectors.length
		if ("addSectors" in c) for (const sectorName in c.addSectors) if (Math.random() < c.addSectors[sectorName]) {
			company.addSector(sectorName)
		}
		if ("removeSectors" in c) for (const sectorName in c.removeSectors) if (Math.random() < c.removeSectors[sectorName]) {
			company.removeSector(sectorName)
		}
		const sectorsCountDiff = company.getSectors().length - initialSectorsCount
		if (sectorsCountDiff != 0) newsC += 0.2 / sectorsCountDiff
		if ("employ" in c) for (const sectorName in c.employ) if (sectors.includes(sectorName) && Math.random() < c.employ[sectorName][0]) {
			company.employ(c.employ[sectorName][1])
			newsC += 0.4 * (c.employ[sectorName][1] - 1)
		}
		return newsC
	}

	#createPressRelease(i) {
		const company = this.#companies[i]
		const name = this.#data.companies[i]
		const sectors = company.getSectors()
		const lastReport = company.getReports().at(-1)
		if (lastReport.tick < this.getTick() && Math.random() < 0.2) {
			const assetsDiff = company.getCash() - lastReport.cash
			company.addReport()
			let headline = "Company " + name + " releases earnings report: cash currently $" + helpers.format(company.getCash())
			headline += ", $" + helpers.format(assetsDiff) + " compared to last report"
			return headline
		}
		if (Math.pow(Math.random(), Math.log10(company.getEmployeesCount())) < 0.01) {
			const revenue = Math.pow(Math.random(), 3) * 10000 + 100
			const sectorName = sectors[Math.floor(Math.random() * sectors.length)]
			company.addRevenueSource(sectorName, revenue)
			return "Company " + name + " releases new " + (revenue < 1000 ? "minor" : "major") + " " + sectorName + " product"
		}
		if (Math.random() < 0.95) {
			if (company.getSectors().includes("retail")) {
				company.removeSector("retail")
				return "Company " + name + " exits retail sector"
			}
			else {
				company.addSector("retail")
				return "Company " + name + " enters retail sector"
			}
		}
		return "Company " + name + " may or may not be a good investment, analysts say"
	}

	#nextFundamentals(i) {
		const company = this.#companies[i]
		const thisReport = company.getReports().at(-1)
		if (this.getTick() > 0 && thisReport.tick == this.getTick()) {
			const lastReport = company.getReports().at(-2)
			let coeff = (thisReport.cash - lastReport.cash) / 10000
			const parameter = 1000
			coeff = (coeff > 0 ? 1 : -1) * (-parameter / (parameter + Math.abs(coeff)) + 1)
			company.addPressure(0.5 * coeff * company.getPriceHistory().at(-1))
		}
		if (Math.random() < 0.1) company.multiplyFixedCosts(helpers.multiply(1))
		company.spend()
		company.earn()
	}

	#nextTechnicals(i, newsC) {
		const company = this.#companies[i]
		const initialPrice = company.getPriceHistory().at(-1)
		company.addPressure(initialPrice * newsC)
		const rawPrice = initialPrice + 0.8 * company.getPressure()
		company.addPressure(initialPrice - rawPrice)
		const noise = helpers.add(0.7)
		const finalPrice = rawPrice + noise * Math.max(Math.abs(rawPrice - initialPrice) * 0.2, rawPrice * 0.02)
		company.addPrice(finalPrice)
		company.addPressure(rawPrice - finalPrice)
	}

	#nextNews() {
		let theNews = null
		if (Math.random() <= this.#newsProbability) {
			if (Math.random() < 0.3) {
				const companyId = Math.floor(Math.random() * this.#companies.length)
				theNews = [ -1, this.#createPressRelease(companyId) ]
			}
			else {
				const chainId = Math.floor(Math.random() * this.#chains.length)
				theNews = [ chainId, this.#chains[chainId].iterate() ]
			}
		}
		this.#newsHistory.push(theNews)
	}

	next() {
		for (let i = 0; i < this.#companies.length; i++) {
			this.#nextFundamentals(i)
			this.#nextTechnicals(i, this.#applyNews(i))
		}
		this.#nextNews()
		return {
			prices: this.getLastPrices(),
			news: this.getLastNews(),
		}
	}
}
