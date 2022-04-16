class Trainer {
	#name
	#neural
	#createModel
	#createOptimizer
	#block

	constructor(name, neural, createModel, createOptimizer) {
		this.#name = name
		this.#neural = neural
		this.#createModel = createModel
		this.#createOptimizer = createOptimizer
		this.#block = false
		this.reset()
	}

	save() {
		if (this.#block) return
		const model = this.#neural.getModel()
		if (model !== null) model.save("downloads://" + this.#name)
	}

	reset() {
		if (this.#block) return
		this.#block = true
		this.#neural.setModel(this.#createModel())
		console.log("Model \"" + this.#name + "\" reset")
		this.#block = false
	}

	load() {
		if (this.#block) return
		this.#block = true
		const uploadedFiles = document.getElementById(this.#name + "Files").files
		let files = [ uploadedFiles[1], uploadedFiles[0] ]
		if (uploadedFiles[0].name.endsWith(".json")) files = [ uploadedFiles[0], uploadedFiles[1] ]
		document.getElementById(this.#name + "Files").value = null
		tf.loadLayersModel(tf.io.browserFiles(files)).then((model) => {
			this.#neural.setModel(model)
			console.log("Model \"" + this.#name + "\" loaded")
			this.#block = false
		})
	}

	train() {
		if (this.#block) return
		this.#block = true
		const count = parseInt(document.getElementById(this.#name + "Count").value)
		this.#neural.fit(count, this.#createOptimizer()).then(() => {
			console.log("Model \"" + this.#name + "\" trained")
			this.#block = false
		})
	}
}

trainers = {}

trainers.actions = () => {
	const sectorNames = Object.keys(testData.sectors)
	const defaultParams = Generator.getDefaultParams()
	const valuesPerSector = 2 + defaultParams.department.maxProducts

	const encodeInput = (conditions) => {
		const cash = conditions.company.getAssets().getCash()
		const singles = [
			helpers.normalize(conditions.inflation, 10),
			(cash > 0 ? 1 : -1) * helpers.normalize(cash, 1000000),
		]
		const sectors = new Array(sectorNames.length * defaultParams.department.maxProducts * 3)
		for (let i = 0; i < sectorNames.length; i++) for (let j = 0; j < defaultParams.department.maxProducts; j++) {
			const firstIndex = i * defaultParams.department.maxProducts * 3 + j * 3
			const departments = conditions.company.getDepartments()
			const products = (sectorNames[i] in departments ? departments[sectorNames[i]].getProducts() : {})
			sectors[firstIndex] = (j in products ? helpers.normalize(products[j].profit, 10000) : 0)
			sectors[firstIndex + 1] = (j in products ? products[j].progress : 0)
			sectors[firstIndex + 2] = (j in products ? +products[j].announced : 0)
		}
		const demand = sectorNames.map((sectorName) => helpers.normalize(testData.sectors[sectorName].demand, 10))
		const development = sectorNames.map((sectorName) => helpers.normalize(testData.sectors[sectorName].development, 10000))
		return singles.concat(sectors, demand, development)
	}

	const encodeOutput = (individual) => {
		return individual.map((value, index) => {
			const relativeIndex = index % sectorNames.length
			if (relativeIndex == 0) return helpers.normalize(value, 10)
			if (relativeIndex == 1) return value / defaultParams.department.maxProducts
			return +value
		})
	}

	const decodeOutput = (output) => {
		let sectors = {}
		for (let i = 0; i < sectorNames.length; i++) {
			const itemsPerSector = defaultParams.department.maxProducts * 3
			const removeProducts = output.slice(i * itemsPerSector + 2, (i + 1) * itemsPerSector)
			sectors[sectorNames[i]] = {
				employ: helpers.denormalize(output[i * itemsPerSector], 10),
				removeProducts: removeProducts.map((item, index) => [ index, Math.round(item) == 1 ]).filter((product) => product[1]).map((product) => product[0]),
				addProducts: output[i * itemsPerSector + 1] * defaultParams.department.maxProducts,
			}
		}
	}

	const randomizeEmployeesCountFactor = () => helpers.multiply(10)
	const randomizeNewProductsCount = () => Math.round(Math.random() * defaultParams.department.maxProducts)
	const randomizeBoolean = () => Boolean(Math.round(Math.random()))

	const createCompany = (existingCompany = null) => {
		const assets = new Portfolio(testData.companyNames)
		assets.addCash(existingCompany !== null ? existingCompany.getAssets().getCash() : 10000 * helpers.multiply(10))
		const departments = {}
		for (const sectorName in testData.sectors) if ((existingCompany !== null && sectorName in existingCompany.getDepartments()) || (existingCompany === null && Math.random() < 0.2)) {
			let employeesCount = Math.round(100 * helpers.multiply(10))
			if (existingCompany !== null) employeesCount = existingCompany.getDepartments()[sectorName].getEmployeesCount()
			let salary = helpers.multiply(0.1) * testData.sectors[sectorName].salary
			if (existingCompany !== null) salary = existingCompany.getDepartments()[sectorName].getSalary()
			departments[sectorName] = new Department(
				employeesCount,
				salary,
				{},
			)
			if (existingCompany !== null) for (const productName in existingCompany.getDepartments()[sectorName].getProducts()) {
				const product = existingCompany.getDepartments()[sectorName].getProducts()[productName]
				departments[sectorName].addProduct(product.profit, product.progress, product.announced)
			}
			else {
				const productsCount = 1 + Math.round(Math.random() * (defaultParams.department.maxProducts - 1))
				for (let i = 0; i < productsCount; i++) departments[sectorName].addProduct(
					helpers.multiply(defaultParams.department.profitMultiplier) * defaultParams.department.profit,
					Math.random() < 0.5 ? 1 : Math.random(),
					Boolean(Math.round(Math.random())),
				)
			}
		}
		return new Company(0, 100, departments, assets)
	}

	const createConditions = () => {
		const inflation = 1.5 + 0.5 * helpers.add()
		const company = createCompany()
		return { inflation, company }
	}

	const createIndividual = new Array(sectorNames.length * valuesPerSector)
	for (let i = 0; i < sectorNames.length; i++) {
		createIndividual[i * valuesPerSector] = randomizeEmployeesCountFactor
		createIndividual[i * valuesPerSector + 1] = randomizeNewProductsCount
		for (let j = 2; j < valuesPerSector; j++) {
			createIndividual[i * valuesPerSector + j] = randomizeBoolean
		}
	}

	const zeroIndividual = new Array(sectorNames.length * valuesPerSector)
	for (let i = 0; i < sectorNames.length; i++) {
		zeroIndividual[i * valuesPerSector] = 1
		zeroIndividual[i * valuesPerSector + 1] = 0
		for (let j = 2; j < valuesPerSector; j++) {
			zeroIndividual[i * valuesPerSector + j] = false
		}
	}

	const calculateFitness = (conditions, individual) => {
		let inflation = conditions.inflation
		const clonedCompany = createCompany(conditions.company)
		const demandBySector = Object.fromEntries(Object.entries(testData.sectors).map((sector) => [ sector[0], sector[1].demand ]))
		const developmentBySector = Object.fromEntries(Object.entries(testData.sectors).map((sector) => [ sector[0], sector[1].development ]))
		for (let i = 0; i < sectorNames.length; i++) if (sectorNames[i] in clonedCompany.getDepartments()) {
			const department = clonedCompany.getDepartments()[sectorNames[i]]
			department.employ(Math.round((individual[i * valuesPerSector] - 1) * department.getEmployeesCount()))
			for (let j = 2; j < valuesPerSector; j++) {
				if (individual[i * valuesPerSector + j] && (j-2) in department.getProducts() && department.getProducts()[j-2].progress < 1 && !department.getProducts()[j-2].announced) {
					department.removeProduct(j)
				}
			}
			const maxNewProducts = defaultParams.department.maxProducts - Object.keys(department.getProducts()).length
			for (let j = 0; j < Math.max(maxNewProducts, individual[i * valuesPerSector + 1]); j++) {
				department.addProduct(helpers.multiply(defaultParams.department.profitMultiplier) * defaultParams.department.profit)
			}
		}
		for (let i = 0; i < 100; i++) {
			inflation *= defaultParams.macro.inflationCoefficient
			for (const sectorName in clonedCompany.getDepartments()) {
				const department = clonedCompany.getDepartments()[sectorName]
				let announcement = false
				for (const productName in department.getProducts()) {
					const product = department.getProducts()[productName]
					if (!announcement && Math.random() < 0.7 && product.progress == 1 && !product.announced) {
						department.announceProduct(productName)
						announcement = true
					}
					department.developProduct(productName, demandBySector[sectorName] * department.getEmployeesCount() / developmentBySector[sectorName])
				}
			}
			clonedCompany.getAssets().applyInterestRate(defaultParams.macro.interestRate)
			clonedCompany.next(demandBySector, inflation)
		}
		const cashDiff = clonedCompany.getAssets().getCash() - conditions.company.getAssets().getCash()
		const normalized = helpers.normalize(cashDiff, conditions.company.getTotalRevenue(demandBySector) + 1000)
		if (cashDiff > 0) return 0.1 + 0.9 * normalized
		return 0.1 - 0.1 * normalized
	}

	const dummyInput = encodeInput(createConditions())

	return new Trainer(
		"actions",
		new Neural(
			{
				optimizer: tf.train.adam(),
				loss: tf.losses.meanSquaredError,
				metrics: [ "mse", "accuracy" ],
			},
			{
				batchSize: 64,
				epochs: 200,
				shuffle: true,
				callbacks: tfvis.show.fitCallbacks(
					{ name: "Performance" },
					[ "loss", "mse", "acc" ],
					{ height: 200, callbacks: [ "onEpochEnd" ] },
				),
			},
			encodeInput,
			encodeOutput,
			decodeOutput,
			(runId, pair) => {
				console.log("Training \"actions\", run " + runId + ": " + pair.fitness + " fitness in " + pair.iterations + " iteration(s)")
			},
		),
		() => {
			const model = tf.sequential()
			model.add(tf.layers.dense({ inputShape: [ dummyInput.length ], units: 512, useBias: true }))
			model.add(tf.layers.dense({ units: zeroIndividual.length, useBias: true }))
			return model
		},
		() => (new Optimizer(createConditions, createIndividual, zeroIndividual, calculateFitness, 2000, 0.55, 30)),
	)
}

window.onload = () => {
	trainers = Object.fromEntries(Object.entries(trainers).map((trainer) => [ trainer[0], trainer[1]() ]))
}
