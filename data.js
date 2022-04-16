testData = {
	companyNames: [ "ASDF", "BOOM", "CIKE", "DEA", "EVE", "FIN" ],
	sectors: {
		"gaming": { salary: 70, demand: 1, development: 100000 },
		"software": { salary: 100, demand: 2, development: 1000 },
		"internet": { salary: 80, demand: 2, development: 1000 },
		"computer": { salary: 90, demand: 2, development: 100000 },
		"semiconductor": { salary: 100, demand: 2, development: 100000 },
		"telecommunications": { salary: 60, demand: 2, development: 10000 },
		"agriculture": { salary: 50, demand: 1, development: 10000 },
		"aerospace": { salary: 70, demand: 0.5, development: 100000 },
		"energy": { salary: 100, demand: 2, development: 100000 },
		"utilities": { salary: 60, demand: 2, development: 100000 },
		"automotive": { salary: 70, demand: 1, development: 100000 },
		"apparel": { salary: 30, demand: 2, development: 1000 },
		"cosmetics": { salary: 40, demand: 1, development: 1000 },
		"beverage": { salary: 40, demand: 1, development: 1000 },
		"food": { salary: 20, demand: 2, development: 100 },
		"household": { salary: 30, demand: 1, development: 100 },
		"healthcare": { salary: 100, demand: 1, development: 10000 },
		"media": { salary: 40, demand: 1, development: 100 },
		"gambling": { salary: 90, demand: 0.5, development: 10000 },
		"finance": { salary: 90, demand: 0.5, development: 1000 },
	},
	events: [
		{
			names: {
				0: "The pandemic largely stops",
				1: "New virus cases found",
				2: "Many new virus cases found locally",
				3: "A pandemic starts",
				4: "The pandemic worsens",
				5: "The pandemic gets much worse",
				6: "The pandemic slowly starts to improve",
				7: "The pandemic improves",
			},
			transitions: {
				0: [ [ 1, 1.00 ] ],
				1: [ [ 1, 0.75 ], [ 2, 0.25 ] ],
				2: [ [ 1, 0.25 ], [ 2, 0.50 ], [ 3, 0.25 ] ],
				3: [ [ 0, 0.25 ], [ 4, 0.75 ] ],
				4: [ [ 5, 0.75 ], [ 7, 0.25 ] ],
				5: [ [ 6, 1.00 ] ],
				6: [ [ 5, 0.50 ], [ 7, 0.50 ] ],
				7: [ [ 0, 0.25 ], [ 4, 0.75 ] ],
			},
			consequences: {
				0: {
					changeDemand: { healthcare: 0.5 },
				},
				1: {},
				2: {},
				3: {},
				4: {},
				5: {},
				6: {},
				7: {},
			},
		},
	],
}
