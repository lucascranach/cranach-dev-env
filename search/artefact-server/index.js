
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const fs = require('fs');

const mapping = require('./utils/mapping');


const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


const graphicFilenames = [
	'cda-graphics-v2.virtual.de.json',
	'cda-graphics-v2.virtual.en.json',
];

const paintingFilenames = [
	'cda-paintings-v2.de.json',
	'cda-paintings-v2.en.json',
];

const archivalFilenames = [
	'cda-archivals-v2.de.json',
	'cda-archivals-v2.en.json',
];


const compileItems = (items, filename) => {
	const fileContent = JSON.parse(fs.readFileSync(`./data/${filename}`));

	return [...items, ...fileContent.items];
};

const graphicItems = graphicFilenames.reduce(compileItems, []);
const paintingItems = paintingFilenames.reduce(compileItems, []);
const archivalItems = archivalFilenames.reduce(compileItems, []);


const MAX_RESULTS = 100;


app.get('/random', (req, res) => {
	const { lang = 'de' } = req.query;

	const graphicsCnt = Math.ceil(Math.random() * MAX_RESULTS);
	const paintingsCnt = Math.ceil(Math.random() * (MAX_RESULTS - graphicsCnt));
	const archivalsCnt = MAX_RESULTS - (graphicsCnt + paintingsCnt);

	const langGraphicItems = graphicItems.filter(item => item.metadata.langCode === lang);;
	const langPaintingItems = paintingItems.filter(item => item.metadata.langCode === lang);
	const langArchivalItems = archivalItems.filter(item => item.metadata.langCode === lang);

	const randomizedGraphicItems = langGraphicItems.sort(() => Math.random() - 0.5);
	const randomizedPaintingItems = langPaintingItems.sort(() => Math.random() - 0.5);
	const randomizedArchivalItems = langArchivalItems.sort(() => Math.random() - 0.5);


	const foundItems = {
		graphics: randomizedGraphicItems.slice(0, graphicsCnt).map(mapping.extractMetadata),
		paintings: randomizedPaintingItems.slice(0, paintingsCnt).map(mapping.extractMetadata),
		archivals: randomizedArchivalItems.slice(0, archivalsCnt).map(mapping.extractMetadata),
	};

	res.statusCode = 200;
	res.json(foundItems);
});


app.get('/', (req, res) => {
	const params = Object.entries(req.query).reduce((acc, [key, value]) => {
		const [cleanKey, filterOp = ''] = key.split(':');

		const type = !!filterOp ? 'filter' : 'remaining';

		acc[type][cleanKey] = {
			value,
			op: filterOp,
		};

		return acc;
	}, { filter: {}, remaining: {} });

	const { lang = { value: 'de' } } = params.remaining;

	const langGraphicItems = graphicItems.filter(item => item.metadata.langCode === lang.value);
	const langPaintingItems = paintingItems.filter(item => item.metadata.langCode === lang.value);
	const langArchivalItems = archivalItems.filter(item => item.metadata.langCode === lang.value);

	const allItems = [...langGraphicItems, ...langPaintingItems, ...langArchivalItems];

	let filteredItems = Object.entries(params.filter).reduce((acc, [key, data]) => {
		if (['dating_begin', 'dating_end'].includes(key)) {
			const fieldName = key === 'dating_begin' ? 'begin' : 'end';
			const val = parseInt(data.value, 10);

			if (Number.isNaN(val)) {
				return acc;
			}

			switch(data.op) {
				case 'lt':
					return acc.filter((item) => {
						if (!item.dating[fieldName]) {
							return true;
						}
						return item.dating[fieldName] < val;
					});
					break;

				case 'lte':
					return acc.filter((item) => {
						if (!item.dating[fieldName]) {
							return true;
						}
						return item.dating[fieldName] <= val;
					});
					break;

				case 'gt':
					return acc.filter((item) => {
						if (!item.dating[fieldName]) {
							return true;
						}
						return item.dating[fieldName] > val;
					});
					break;

				case 'gte':
					return acc.filter((item) => {
						if (!item.dating[fieldName]) {
							return true;
						}
						return item.dating[fieldName] >= val;
					});
					break;
			}
		}

		if (key === 'term') {
			switch(data.op) {
				case 'eq':
					const termRegExp = new RegExp(`${data.value}`, 'ig');
					return acc.filter((item) => termRegExp.exec(item.metadata.title));
					break;
			}
		}

		return acc;
	}, allItems);

	if (params.remaining['from']) {
		const fromNumber = parseInt(params.remaining['from'].value, 10);

		if (!Number.isNaN(fromNumber)) {
			filteredItems = filteredItems.slice(fromNumber);
		}
	}

	if (params.remaining['size']) {
		const sizeNumber = parseInt(params.remaining['size'].value, 10);

		if (!Number.isNaN(sizeNumber)) {
			filteredItems = filteredItems.slice(0, sizeNumber);
		} else {
		}
	}

	const filteredItemsMetadata = filteredItems.map((item) => item.metadata);

	const results = {
		graphics: filteredItemsMetadata.filter((item) => item.entityType === 'GRAPHIC'),
		paintings: filteredItemsMetadata.filter((item) => item.entityType === 'PAINTING'),
		archivals: filteredItemsMetadata.filter((item) => item.entityType === 'ARCHIVAL'),
	}

	res.json(results);
});


app.listen(port, () => {
	console.log(`Listening on http://localhost:${port} ...`);
});