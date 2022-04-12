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
	pick: (arr) => {
		return Math.floor(Math.random() * arr.length)
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
		this.#employeesCount += Math.max(2 - this.#employeesCount, employeesCountDiff)
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

	addFixedCosts(fixedCostsDiff) {
		this.#fixedCosts += Math.max(-this.#fixedCosts, fixedCostsDiff)
	}

	spend() {
		this.#cash -= this.#fixedCosts * helpers.multiply(0.1)
		this.#cash -= this.#employeesCount * 100 * helpers.multiply(0.1)
	}

	getRevenueSources(sectorName = null) {
		if (sectorName === null) return this.#revenueSources
		return this.#revenueSources.filter((source) => (source == sectorName))
	}

	getTotalRevenue(sectorName = null) {
		return this.getRevenueSources(sectorName).reduce((prevValue, curValue) => (prevValue + curValue[1]), 0)
	}

	addRevenueSource(sectorName, revenue) {
		this.#revenueSources.push([ sectorName, revenue ])
	}

	earn() {
		this.#cash += this.getTotalRevenue() * helpers.add(1, 0.8)
	}

	next(smoothing = 0) {
		this.spend()
		this.earn()
		let p = this.#pressure * (1 - smoothing)
		const noise = helpers.add(0.7) * Math.max(0.02, 0.2 * Math.abs(p))
		p += noise
		this.#priceHistory.push(this.#priceHistory.at(-1) * (p > 0 ? p + 1 : 1 / (1 - p)))
		this.#pressure -= p
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
		this.#companies = this.#data.companies.map((name) => {
			const size = Math.pow(Math.random(), 0.7) * 1000 + 10
			return new Company(
				0,
				fixedInitialPrice ? 100 : Math.random() * 90 + 10,
				[ "gaming" ],
				Math.floor(helpers.multiply(0.1) * size),
				size * 100,
				helpers.multiply(0.1) * size,
				[ [ "gaming", helpers.multiply(0.1) * size * 1000 ] ],
			)
		})
		this.#chains = this.#data.events.map((chain) => (new Markov(chain.transitions, 0)))
		this.#newsHistory = [ null ]
	}

	getTick() {
		return this.#newsHistory.length - 1
	}

	getLastPrices() {
		return this.#companies.map((company) => company.getPriceHistory().at(-1))
	}

	getLastNews() {
		return this.#newsHistory.at(-1)
	}

	getPriceHistory(i) {
		return this.#companies[i].getPriceHistory()
	}

	getSectorsAndProducts(i) {
		const company = this.#companies[i]
		return Object.fromEntries(company.getSectors().map((sectorName) => [
			sectorName,
			company.getRevenueSources(sectorName).map((product) => product[1]),
		]))
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
			company.employ(Math.round((1 - c.employ[sectorName][1]) * company.getEmployeesCount()))
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
			const revenue = Math.pow(Math.random(), 3) * 1000000 + 10000
			const sectorName = sectors[helpers.pick(sectors)]
			company.addRevenueSource(sectorName, revenue)
			company.employ(Math.floor(revenue / 10000))
			company.addFixedCosts(revenue / 1000)
			return "Company " + name + " releases new " + (revenue < 100000 ? "minor" : "major") + " " + sectorName + " product"
		}
		if (Math.random() < 0.95 && company.getSectors().length > 0) {
			const sectorRevenues = company.getSectors().map((sectorName) => ([
				sectorName,
				company.getTotalRevenue(sectorName),
			]))
			const chosen = sectorRevenues[Math.min(sectorRevenues.map((sr) => sr[1]))]
			company.removeSector(chosen[0])
			const firedCount = Math.round(-Math.floor(chosen[1] / 10000) * helpers.multiply(0.2))
			company.employ(firedCount)
			company.addFixedCosts(-chosen[1] / 1000)
			return "Company " + name + " exits " + chosen[0] + " sector, firing " + firedCount
		}
		return "Company " + name + " may or may not be a good investment, analysts say"
	}

	#nextFundamentals(i) {
		const company = this.#companies[i]
		const thisReport = company.getReports().at(-1)
		if (this.getTick() > 0 && thisReport.tick == this.getTick()) {
			const lastReport = company.getReports().at(-2)
			let coeff = (thisReport.cash - lastReport.cash) / 10000
			const parameter = 10000
			coeff = (coeff > 0 ? 1 : -1) * (-parameter / (parameter + Math.abs(coeff)) + 1)
			company.addPressure(0.5 * coeff)
		}
		if (Math.random() < 0.2) company.employ(Math.round(helpers.add() * 0.05 * company.getEmployeesCount()))
	}

	#nextTechnicals(i, newsC) {
		const company = this.#companies[i]
		company.addPressure(newsC)
	}

	#nextNews() {
		let theNews = null
		if (Math.random() <= this.#newsProbability) {
			if (Math.random() < 0.3) {
				const companyId = helpers.pick(this.#companies)
				theNews = [ -1, this.#createPressRelease(companyId) ]
			}
			else {
				const chainId = helpers.pick(this.#chains)
				theNews = [ chainId, this.#chains[chainId].iterate() ]
			}
		}
		this.#newsHistory.push(theNews)
	}

	next() {
		for (let i = 0; i < this.#companies.length; i++) {
			this.#nextFundamentals(i)
			this.#nextTechnicals(i, this.#applyNews(i))
			this.#companies[i].next(0.2)
		}
		this.#nextNews()
		return {
			prices: this.getLastPrices(),
			news: this.getLastNews(),
		}
	}
}
