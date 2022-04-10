testData = {
	companies: [ "A", "B", "C", "D", "E", "F" ],
	events: [
		{
			names: {
				0: "Pandemic stops",
				1: "New virus cases",
				2: "Pandemic starts",
				3: "Pandemic worsens",
				4: "Pandemic really worsens",
				5: "Pandemic begins improving",
				6: "Pandemic improves",
			},
			transitions: {
				0: [ [ 1, 1.00 ] ],
				1: [ [ 1, 0.99 ], [ 2, 0.01 ] ],
				2: [ [ 0, 0.01 ], [ 3, 0.99 ] ],
				3: [ [ 4, 0.75 ], [ 6, 0.25 ] ],
				4: [ [ 4, 0.50 ], [ 5, 0.50 ] ],
				5: [ [ 4, 0.50 ], [ 6, 0.50 ] ],
				6: [ [ 0, 0.25 ], [ 3, 0.75 ] ],
			},
			consequences: {
				0: {
					removeSectors: { healthcare: 0.2 },
					employ: { gaming: [ 0.9, 1.5 ], healthcare: [ 0.7, 0.8 ] },
				},
				1: {},
				2: {
					addSectors: { healthcare: 0.1 },
					employ: { gaming: [ 0.9, 0.5 ], healthcare: [ 0.9, 1.5 ] },
				},
				3: {
					addSectors: { healthcare: 0.2 },
					employ: { gaming: [ 0.2, 0.8 ] },
				},
				4: {
					employ: { gaming: [ 0.9, 0.8 ] },
				},
				5: {
					employ: { gaming: [ 0.7, 1.2 ] },
				},
				6: {
					employ: { gaming: [ 0.7, 1.5 ], healthcare: [ 0.2, 0.9 ] },
				},
			},
		},
	],
}
