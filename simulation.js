helpers = {
	sign: () => (Math.round(Math.random()) * 2 - 1),
	remove: (arr, value) => {
		arr.splice(arr.indexOf(value), 1)
	},
	pad: (integer, count) => ("0".repeat(count - integer.toString().length) + integer),
	format: (amount) => {
		const sign = (amount < 0 ? "-" : "")
		amount = Math.round(Math.abs(amount) * 100) / 100
		let whole = Math.floor(amount)
		let string = "." + helpers.pad(Math.round((amount - whole) * 100), 2)
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
	constructor(states, initialState) {
		this.states = states
		this.currentState = initialState
	}

	iterate() {
		const result = Math.random()
		let value = 0
		const cur = this.states[this.currentState]
		for (let i = 0; i < cur.length; i++) {
			value += cur[i][1]
			if (result <= Math.round(value * 1000000) / 1000000) {
				this.currentState = cur[i][0]
				return cur[i][0]
			}
		}
	}
}

class Generator {
	constructor(data, newsProbability = 1, fixedInitialPrice = false) {
		this.data = data
		this.newsProbability = newsProbability
		this.companyProperties = this.data.companies.map((name) => ({
			pressure: 0,
			priceHistory: [ (fixedInitialPrice ? 100 : Math.random() * 90 + 10) ],
			details: {
				sectors: [ "gaming" ],
				employeesCount: Math.floor(Math.pow(Math.random(), 5) * 10000) + 10,
				cash: Math.random() * 100000 + 1000,
				cashSinceReport: 0,
				report: null,
				revenueSources: [ Math.random() * 10 + 1 ],
			},
		}))
		this.chains = this.data.events.map((chain) => (new Markov(chain.transitions, 0)))
		this.newsHistory = [ null ]
	}

	getHistoryLength() {
		return this.newsHistory.length
	}

	getLastPrices() {
		return this.data.companies.map((name, index) => (this.companyProperties[index].priceHistory.at(-1)))
	}

	getLastNews() {
		return this.newsHistory.at(-1)
	}

	getPriceHistory(i) {
		return this.companyProperties[i].priceHistory
	}

	#applyNews(i) {
		const n = this.getLastNews()
		if (!n || n[0] == -1) return 0
		const d = this.companyProperties[i].details
		const c = this.data.events[n[0]].consequences[n[1]]
		let newsC = 0
		const initialSectorsCount = d.sectors.length
		if ("addSectors" in c) for (const sectorName in c.addSectors) if (Math.random() < c.addSectors[sectorName]) {
			if (!d.sectors.includes(sectorName)) d.sectors.push(sectorName)
		}
		if ("removeSectors" in c) for (const sectorName in c.removeSectors) if (Math.random() < c.removeSectors[sectorName]) {
			helpers.remove(d.sectors, sectorName)
		}
		const sectorsCountDiff = d.sectors.length - initialSectorsCount
		if (sectorsCountDiff != 0) newsC += 0.2 / sectorsCountDiff
		if ("employ" in c) for (const sectorName in c.employ) if (d.sectors.includes(sectorName) && Math.random() < c.employ[sectorName][0]) {
			d.employeesCount *= c.employ[sectorName][1]
			newsC += 0.4 * (c.employ[sectorName][1] - 1)
		}
		return newsC
	}

	#createPressRelease(i) {
		const d = this.companyProperties[i].details
		const name = this.data.companies[i]
		if (Math.random() < 0.2) {
			const assetsChange = d.cash / (d.cash - d.cashSinceReport)
			d.report = assetsChange
			d.cashSinceReport = 0
			return "Company " + name + " releases earnings report: " + helpers.format(assetsChange - 1) + " since last report"
		}
		if (Math.pow(Math.random(), Math.log10(d.employeesCount)) < 0.01) {
			const revenue = Math.pow(Math.random(), 3) * 100 + 10
			d.revenueSources.push(revenue)
			return "Company " + name + " releases new " + (revenue < 0.3 ? "minor" : "major") + " product"
		}
		if (Math.random() < 0.95) {
			if (d.sectors.includes("retail")) {
				helpers.remove(d.sectors, "retail")
				return "Company " + name + " exits retail sector"
			}
			d.sectors.push("retail")
			return "Company " + name + " enters retail sector"
		}
		return "Company " + name + " may or may not be a good investment, analyst says"
	}

	#nextFundamentals(i) {
		const p = this.companyProperties[i]
		const d = this.companyProperties[i].details
		if (d.report !== null) {
			p.pressure += (d.report > 0 ? d.report * 0.5 : - 1 - 0.5 / d.report)
			d.report = null
		}
		const cashChange = d.revenueSources.reduce((prevValue, curValue) => (
			prevValue + curValue * (Math.random() * 0.5 - 0.2)
		), 0)
		d.cash += cashChange
		d.cashSinceReport += cashChange
	}

	#nextTechnicals(i, newsC) {
		const p = this.companyProperties[i]
		const initialPrice = p.priceHistory.at(-1)
		p.pressure += initialPrice * newsC
		const rawPrice = initialPrice + 0.8 * p.pressure
		p.pressure -= rawPrice - initialPrice
		const s = helpers.sign()
		const noise = s * Math.pow(Math.random(), (s == 1 ? 0.4 : 0.5))
		p.priceHistory.push(rawPrice + noise * Math.max(Math.abs(rawPrice - initialPrice) * 0.2, rawPrice * 0.02))
		p.pressure -= p.priceHistory.at(-1) - rawPrice
	}

	#nextNews() {
		let theNews = null
		if (Math.random() <= this.newsProbability) {
			if (Math.random() < 0.3) {
				const companyId = Math.floor(Math.random() * this.data.companies.length)
				theNews = [ -1, this.#createPressRelease(companyId) ]
			}
			else {
				const chainId = Math.floor(Math.random() * this.chains.length)
				theNews = [ chainId, this.chains[chainId].iterate() ]
			}
		}
		this.newsHistory.push(theNews)
	}

	next() {
		for (let i = 0; i < this.data.companies.length; i++) {
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
