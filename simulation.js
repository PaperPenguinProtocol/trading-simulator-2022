helpers = {
	sign: () => (Math.round(Math.random()) * 2 - 1),
	color: (fraction) => {
		const width = 0.3
		const other = (fraction < width ? fraction + 1 : fraction - 1)
		const o = (l, f) => (Math.min(f + width, l + 1/3) - Math.max(f - width, l))
		const overlap = (l) => (255 * 3 * Math.max(0, Math.max(o(l, fraction), o(l, other))))
		return "rgb(" + Math.round(overlap(0)) + ", " + Math.round(overlap(1/3)) + ", " + Math.round(overlap(2/3)) + ")"
	},
	remove: (arr, value) => {
		arr.splice(arr.indexOf(value), 1)
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
			},
		}))
		this.chains = this.data.events.map((chain) => (new Markov(chain.transitions, 0)))
		this.newsHistory = [ null ]
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
		if (!n) return 0
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
		const chainId = Math.floor(Math.random() * this.chains.length)
		this.newsHistory.push(Math.random() <= this.newsProbability ? [ chainId, this.chains[chainId].iterate() ] : null)
	}

	next() {
		for (let i = 0; i < this.data.companies.length; i++) this.#nextTechnicals(i, this.#applyNews(i))
		this.#nextNews()
		return {
			prices: this.getLastPrices(),
			news: this.getLastNews(),
		}
	}
}
