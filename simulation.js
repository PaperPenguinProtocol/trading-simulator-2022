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
	format: (amount, round = false) => {
		const sign = (amount < 0 ? "-" : "")
		const hundredfold = Math.round(Math.abs(amount) * 100)
		let whole = Math.floor(hundredfold / 100)
		let string = (round ? "" : "." + helpers.pad(hundredfold - 100 * whole, 2))
		if (whole == 0) return sign + "0" + string
		while (whole > 0) {
			nextWhole = Math.floor(whole / 1000)
			string = "\xa0" + (nextWhole > 0 ? helpers.pad(whole % 1000, 3) : whole % 1000) + string
			whole = nextWhole
		}
		return sign + string.slice(1)
	},
	normalize: (value, middlePoint) => {
		return 1 - middlePoint / (Math.abs(value) + middlePoint)
	},
	mergeDeep: (target, ...sources) => {
		// https://stackoverflow.com/a/34749873
		if (!sources.length) return target
		const source = sources.shift()
		const isObject = (item) => (item && typeof item === "object" && !Array.isArray(item))
		if (isObject(target) && isObject(source)) for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} })
				helpers.mergeDeep(target[key], source[key])
			} else Object.assign(target, { [key]: source[key] })
		}
		return helpers.mergeDeep(target, ...sources)
	}
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

class Genetic {
	#fitnessFunction
	#crossoverFunction
	#mutationFunction
	#population
	#populationFitness

	constructor(fitnessFunction, crossoverFunction, mutationFunction, population) {
		this.#fitnessFunction = fitnessFunction
		this.#crossoverFunction = crossoverFunction
		this.#mutationFunction = mutationFunction
		this.#population = population
		this.#populationFitness = new Array(this.#population.length)
		this.findFittestIndividual()
	}

	findFittestIndividual() {
		let fittestId = 0
		for (let i = 0; i < this.#population.length; i++) {
			this.#populationFitness[i] = this.#fitnessFunction(this.#population[i])
			if (this.#populationFitness[i] > this.#populationFitness[fittestId]) fittestId = i
		}
		return fittestId
	}

	#reproduce() {
		let levels = new Array(this.#populationFitness.length)
		levels[0] = this.#populationFitness[0]
		for (let i = 1; i < this.#populationFitness.length; i++) {
			levels[i] = levels[i - 1] + this.#populationFitness[i]
		}
		const populationFitnessSum = this.#populationFitness.reduce((prevValue, curValue) => (prevValue + curValue), 0)
		const pick = () => {
			const value = Math.random() * populationFitnessSum
			for (let i = 0; i < this.#populationFitness.length; i++) {
				if (value < levels[i]) return i
			}
		}
		const newPopulation = new Array(this.#population.length)
		for (let i = 0; i < this.#population.length; i++) {
			const parent0 = this.#population[pick()]
			const parent1 = this.#population[pick()]
			newPopulation[i] = this.#crossoverFunction(parent0, parent1)
		}
		this.#population = newPopulation
		for (let i = 0; i < this.#population.length; i++) {
			this.#population[i] = this.#mutationFunction(this.#population[i])
		}
	}

	#format(id) {
		return { id, fitness: this.#populationFitness[id], individual: this.#population[id] }
	}

	optimize(fitnessThreshold, iterationLimit) {
		let fittestId
		for (let i = 0; i < iterationLimit; i++) {
			this.#reproduce()
			fittestId = this.findFittestIndividual()
			if (this.#populationFitness[fittestId] >= fitnessThreshold) return { iterations: (i + 1), fittest: this.#format(fittestId) }
		}
		return { iterations: iterationLimit, fittest: this.#format(fittestId) }
	}
}

class Optimizer {
	#encodeConditions
	#encodeIndividual
	#createConditions
	#createIndividual
	#zeroIndividual
	#calculateFitness
	#populationSize
	#fitnessThreshold
	#iterationLimit
	#pairs

	constructor(encodeConditions, encodeIndividual, createConditions, createIndividual, zeroIndividual, calculateFitness, populationSize, fitnessThreshold, iterationLimit) {
		this.#encodeConditions = encodeConditions
		this.#encodeIndividual = encodeIndividual
		this.#createConditions = createConditions
		this.#createIndividual = createIndividual
		this.#zeroIndividual = zeroIndividual
		this.#calculateFitness = calculateFitness
		this.#populationSize = populationSize
		this.#fitnessThreshold = fitnessThreshold
		this.#iterationLimit = iterationLimit
		this.#pairs = []
	}

	run() {
		const conditions = this.#createConditions()
		const fitnessFunction = (individual) => {
			return this.#calculateFitness(conditions, individual)
		}
		const crossoverFunction = (parent0, parent1) => {
			let child = new Array(parent0.length)
			for (let i = 0; i < parent0.length; i++) {
				if (i % 2 == 0) child[i] = parent0[i]
				else child[i] = parent1[i]
			}
			return child
		}
		const mutationFunction = (individual) => {
			for (let i = 0; i < individual.length; i++) if (Math.random() < 0.01) {
				individual[i] = this.#createIndividual[i]()
			}
			return individual
		}
		const population = new Array(this.#populationSize)
		for (let i = 0; i < this.#populationSize; i++) {
			population[i] = new Array(this.#createIndividual.length)
			for (let j = 0; j < this.#createIndividual.length; j++) {
				population[i][j] = this.#createIndividual[j]()
			}
		}
		const genetic = new Genetic(fitnessFunction, crossoverFunction, mutationFunction, population)
		const result = genetic.optimize(this.#fitnessThreshold, this.#iterationLimit)
		const zeroIndividualFitness = this.#calculateFitness(conditions, this.#zeroIndividual)
		const pair = { conditions, individual: result.fittest.individual, fitness: result.fittest.fitness, iterations: result.iterations }
		if (zeroIndividualFitness >= result.fittest.fitness) {
			pair.individual = this.#zeroIndividual
			pair.fitness = zeroIndividualFitness
		}
		this.#pairs.push([ this.#encodeConditions(pair.conditions), this.#encodeIndividual(pair.individual) ])
		return pair
	}

	train(model, fitArgs) {
		const data = tf.tidy(() => {
			tf.util.shuffle(this.#pairs)
			const inputs = this.#pairs.map((item) => item[0])
			const labels = this.#pairs.map((item) => item[1])
			return {
				inputs: tf.tensor2d(inputs, [ this.#pairs.length, inputs[0].length ]),
				labels: tf.tensor2d(labels, [ this.#pairs.length, labels[0].length ]),
			}
		})
		return model.fit(data.inputs, data.labels, fitArgs)
	}
}

class Portfolio {
	#cash
	#stocks

	constructor(companyNames) {
		this.#cash = 0
		this.#stocks = Object.fromEntries(companyNames.map((name) => [ name, 0 ]))
	}

	getCash() {
		return this.#cash
	}

	getStocks() {
		return this.#stocks
	}

	getTotalAssetValue(stockPrices) {
		let value = this.getCash()
		for (name in this.getStocks()) value += this.getStocks()[name] * stockPrices[name]
		return value
	}

	addCash(cashDiff) {
		this.#cash += cashDiff
	}

	applyInterestRate(interestRate) {
		this.#cash *= interestRate
	}

	transactStock(companyName, sharesDiff, price) {
		this.#stocks[companyName] += sharesDiff
		this.addCash(-sharesDiff * price)
	}
}

class Department {
	#employeesCount
	#salary
	#products

	constructor(employeesCount, salary, products) {
		this.#employeesCount = employeesCount
		this.#salary = salary
		this.#products = products
	}

	getEmployeesCount() {
		return this.#employeesCount
	}

	getSalary() {
		return this.#salary
	}

	getProducts(announcedOnly = false) {
		if (announcedOnly) return Object.fromEntries(Object.entries(this.#products).filter((product) => (product[1].announced)))
		return this.#products
	}

	employ(employeesCountDiff) {
		this.#employeesCount += Math.max(10 - this.getEmployeesCount(), employeesCountDiff)
	}

	addSalary(salaryDiff) {
		this.#salary += Math.max(-0.9 * this.getSalary(), salaryDiff)
	}

	addProduct(profit, progress = 0, announced = false) {
		let productName = 0
		while (productName in this.getProducts()) productName += 1
		this.getProducts()[productName] = { profit, progress, announced }
		return productName
	}

	developProduct(productName, progressDiff) {
		const product = this.getProducts()[productName]
		product.progress = Math.min(1, product.progress + progressDiff)
	}

	announceProduct(productName) {
		this.getProducts()[productName].announced = true
	}

	removeProduct(productName) {
		if (productName in this.getProducts()) delete this.getProducts()[productName]
	}

	getCosts(sectorDemand) {
		let costs = this.getEmployeesCount() * this.getSalary()
		for (const productName in this.getProducts()) {
			const product = this.getProducts()[productName]
			if (product.progress < 1) costs += sectorDemand * 0.7 * product.profit
		}
		return costs
	}

	getRevenue(sectorDemand, announcedOnly = true) {
		let revenue = 0
		for (const productName in this.getProducts()) {
			const product = this.getProducts()[productName]
			if (product.progress == 1 && (!announcedOnly || product.announced)) revenue += sectorDemand * product.profit
		}
		return revenue
	}
}

class Company {
	#pressure
	#priceHistory
	#departments
	#assets
	#reports

	constructor(pressure, price, departments, assets) {
		this.#pressure = pressure
		this.#priceHistory = [ price ]
		this.#departments = departments
		this.#assets = assets
		this.#reports = []
	}

	getPressure() {
		return this.#pressure
	}

	getPriceHistory() {
		return this.#priceHistory
	}

	getDepartments() {
		return this.#departments
	}

	getAssets() {
		return this.#assets
	}

	getReports() {
		return this.#reports
	}

	addPressure(pressureDiff) {
		this.#pressure += pressureDiff
	}

	addDepartment(sectorName, department) {
		this.getDepartments()[sectorName] = department
	}

	removeDepartment(sectorName) {
		if (sectorName in this.getDepartments()) delete this.getDepartments()[sectorName]
	}

	getTotalCosts(demandBySector, bySector = false) {
		const costsBySector = Object.fromEntries(Object.entries(this.getDepartments()).map((d) => {
			return [ d[0], d[1].getCosts(demandBySector[d[0]]) ]
		}))
		if (bySector) return costsBySector
		return Object.values(costsBySector).reduce((prevValue, curValue) => (prevValue + curValue), 0)
	}

	getTotalRevenue(demandBySector, bySector = false) {
		const revenueBySector = Object.fromEntries(Object.entries(this.getDepartments()).map((d) => {
			return [ d[0], d[1].getRevenue(demandBySector[d[0]]) ]
		}))
		if (bySector) return revenueBySector
		return Object.values(revenueBySector).reduce((prevValue, curValue) => (prevValue + curValue), 0)
	}

	addReport(demandBySector, stockPrices) {
		this.getReports().push({
			tick: this.getPriceHistory().length - 1,
			cash: this.getAssets().getCash(),
			totalAssetValue: this.getAssets().getTotalAssetValue(stockPrices),
			totalCosts: this.getTotalCosts(demandBySector),
			totalCostsBySector: this.getTotalCosts(demandBySector, true),
			totalRevenue: this.getTotalRevenue(demandBySector),
			totalRevenueBySector: this.getTotalRevenue(demandBySector, true),
		})
	}

	next(demandBySector, inflation, smoothing = 0) {
		this.getAssets().addCash(-inflation * helpers.multiply(0.1) * this.getTotalCosts(demandBySector))
		this.getAssets().addCash(inflation * helpers.multiply(1) * this.getTotalRevenue(demandBySector))
		let p = this.getPressure() * (1 - smoothing)
		const noise = helpers.add(0.7) * Math.max(0.02, 0.2 * Math.abs(p))
		p += noise
		this.getPriceHistory().push(this.getPriceHistory().at(-1) * (p > 0 ? p + 1 : 1 / (1 - p)))
		this.addPressure(-p)
	}
}

class Generator {
	#params
	#sectors
	#events
	#companies
	#chains
	#newsHistory
	#inflation
	#interestRate

	static getDefaultParams() {
		return {
			initial: {
				priceAmplitude: 90,
				employeesCountFactor: 10,
				cashFactor: 10000,
			},
			macro: {
				newsProbability: 1,
				interestRate: 1.0005,
				inflationCoefficient: 1.0002,
			},
			department: {
				maxProducts: 10,
				profit: 10000,
				profitMultiplier: 10,
			},
			newsApplication: {
				demandChangeExp: 3,
			},
		}
	}

	constructor(data, params = {}) {
		this.#params = helpers.mergeDeep(Generator.getDefaultParams(), params)
		this.#sectors = data.sectors
		this.#events = data.events
		const allSectors = Object.keys(this.#sectors)
		this.#companies = Object.fromEntries(data.companyNames.map((name) => {
			const size = Math.pow(Math.random(), 0.7) * 100 + 1
			const sectorName = allSectors[helpers.pick(allSectors)]
			const department = new Department(
				Math.floor(helpers.multiply(0.1) * size * this.#params.initial.employeesCountFactor),
				helpers.multiply(0.1) * this.#sectors[sectorName].salary,
				{ 0: {
					profit: helpers.multiply(this.#params.department.profitMultiplier) * this.#params.department.profit,
					progress: 1,
					announced: true,
				} },
			)
			const assets = new Portfolio(data.companyNames)
			assets.addCash(size * this.#params.initial.cashFactor)
			return [ name, new Company(
				0,
				100 + Math.random() * this.#params.initial.priceAmplitude,
				{ [sectorName]: department },
				assets,
			)]
		}))
		this.#chains = this.#events.map((chain) => (new Markov(chain.transitions, 0)))
		this.#newsHistory = [ null ]
		this.#inflation = 1
		this.#interestRate = this.#params.macro.interestRate
		for (name in this.getCompanies()) this.getCompanies()[name].addReport(this.getDemandBySector(), this.getLastPrices())
	}

	getDemandBySector() {
		return Object.fromEntries(Object.entries(this.#sectors).map((sector) => [ sector[0], sector[1].demand ]))
	}

	getCompanies() {
		return this.#companies
	}

	getLastPrices() {
		return Object.fromEntries(Object.entries(this.getCompanies()).map((company) => [ company[0], company[1].getPriceHistory().at(-1) ]))
	}

	getHeadline(chainId, state) {
		return this.#events[chainId].names[state]
	}

	getLastNews() {
		return this.#newsHistory.at(-1)
	}

	getTick() {
		return this.#newsHistory.length - 1
	}

	getInflation() {
		return this.#inflation
	}

	getInterestRate() {
		return this.#interestRate
	}

	calculatePr(name) {
		const company = this.getCompanies()[name]
		for (const sectorName in company.getDepartments()) {
			const department = company.getDepartments()[sectorName]
			const products = department.getProducts()
			for (const productName in products) {
				if (products[productName].progress == 1 && !products[productName].announced) {
					return { urgency: 1, issue: () => {
						department.announceProduct(productName)
						return "Company " + name + " begins offering a new " + sectorName + " product"
					} }
				}
			}
		}
		const lastReport = company.getReports().at(-1)
		const ticksSinceReport = this.getTick() - lastReport.tick
		if (ticksSinceReport > 10 && (ticksSinceReport > 100 || Math.random() < 0.2)) {
			return { urgency: 1 - 50 / (ticksSinceReport + 40), issue: () => {
				const stockPrices = this.getLastPrices()
				const assetsDiff = company.getAssets().getTotalAssetValue(stockPrices) - lastReport.totalAssetValue
				const demandBySector = this.getDemandBySector()
				const totalProfit = company.getTotalRevenue(demandBySector) - company.getTotalCosts(demandBySector)
				company.addReport(demandBySector, stockPrices)
				let headline = "Company " + name + " releases earnings report"
				headline += ", assets currently total $" + helpers.format(company.getAssets().getTotalAssetValue(stockPrices), true)
				headline += ", $" + helpers.format(assetsDiff / ticksSinceReport, true) + "/day since last report"
				headline += ", profit currently $" + helpers.format(totalProfit, true) + "/day"
				return headline
			} }
		}
		return {
			urgency: 0.0001,
			issue: () => ("Company " + name + " may or may not be a good investment, analysts say"),
		}
	}

	#applyNewsMacro() {
		const n = this.getLastNews()
		if (!n || n[0] == -1) return
		const c = this.#events[n[0]].consequences[n[1]]
		if ("changeDemand" in c) for (const sectorName in c.changeDemand) {
			this.#sectors[sectorName].demand *= c.changeDemand[sectorName]
		}
	}

	#applyNews(name) {
		const n = this.getLastNews()
		if (!n || n[0] == -1) return 0
		const company = this.getCompanies()[name]
		const c = this.#events[n[0]].consequences[n[1]]
		let newsC = 0
		for (const sectorName in company.getDepartments()) {
			const lastReport = company.getReports().at(-1)
			if (sectorName in lastReport.totalRevenueBySector && "changeDemand" in c && sectorName in c.changeDemand) {
				const sectorRevenue = lastReport.totalRevenueBySector[sectorName]
				const totalRevenue = (lastReport.totalRevenue < 10 ? 10 : lastReport.totalRevenue)
				const demandChangeBase = sectorRevenue / totalRevenue
				newsC += (c.changeDemand[sectorName] - 1) * Math.pow(demandChangeBase, this.#params.newsApplication.demandChangeExp)
				if (newsC > 0) console.log()
			}
		}
		return newsC
	}

	#nextTechnicals(name) {
	}

	#findOptimalActions(name) {
		return {}
	}

	#nextFundamentals(name) {
		const company = this.getCompanies()[name]
		const optimalActions = this.#findOptimalActions(name)
		for (sectorName in optimalActions) {
			const sector = optimalActions[sectorName]
			const department = company.getDepartments()[sectorName]
			if (sector.employ != 1) {
				department.employ(Math.floor((sector.employ - 1) * department.getEmployeesCount()))
			}
			for (productName in sector.removeProducts) {
				department.removeProduct(productName)
			}
			for (productName in sector.addProducts) {
				department.addProduct(helpers.multiply(this.#params.product.profitMultiplier) * this.#params.product.profit)
			}
		}
		for (const sectorName in company.getDepartments()) {
			const department = company.getDepartments()[sectorName]
			if (Math.random() < 0.2) department.employ(Math.round(helpers.add() * 0.05 * department.getEmployeesCount()))
			for (const productName in department.getProducts()) {
				department.developProduct(productName, this.getDemandBySector()[sectorName] * department.getEmployeesCount() / this.#sectors[sectorName].development)
			}
		}
		company.getAssets().applyInterestRate(this.getInterestRate())
	}

	#nextNews() {
		const potentialPrs = Object.fromEntries(Object.keys(this.getCompanies()).map((name) => [ name, this.calculatePr(name) ]))
		const threshold = Math.random() * 0.6
		let chosen = Object.keys(potentialPrs)[0]
		for (name in potentialPrs) if (potentialPrs[name].urgency > potentialPrs[chosen].urgency) chosen = name
		if (potentialPrs[chosen].urgency > threshold) {
			const headline = potentialPrs[chosen].issue()
			this.#newsHistory.push([ -1, headline ])
		}
		else if (Math.random() < this.#params.macro.newsProbability) {
			const chainId = helpers.pick(this.#chains)
			this.#newsHistory.push([ chainId, this.#chains[chainId].iterate() ])
		}
		else this.#newsHistory.push(null)
	}

	next() {
		this.#inflation *= this.#params.macro.inflationCoefficient + 0.0002 * helpers.add()
		this.#applyNewsMacro()
		for (name in this.getCompanies()) {
			const company = this.getCompanies()[name]
			company.addPressure(this.#applyNews(name))
			this.#nextTechnicals(name)
			this.#nextFundamentals(name)
			company.next(this.getDemandBySector(), this.#inflation, 0.2)
		}
		this.#nextNews()
		return {
			prices: this.getLastPrices(),
			news: this.getLastNews(),
		}
	}
}
