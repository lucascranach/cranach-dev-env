
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


const graphics = {
	'de': graphicItems.filter(item => item.metadata.langCode === 'de' && item.images),
	'en': graphicItems.filter(item => item.metadata.langCode === 'en' && item.images),
};

const paintings = {
	'de': paintingItems.filter(item => item.metadata.langCode === 'de' && item.images),
	'en': paintingItems.filter(item => item.metadata.langCode === 'en' && item.images),
};

const archivals = {
	'de': archivalItems.filter(item => item.metadata.langCode === 'de'),
	'en': archivalItems.filter(item => item.metadata.langCode === 'en'),
};


const MAX_RESULTS = 100;


app.get('/random', (req, res) => {
	const { lang = 'de' } = req.query;

	const graphicsCnt = Math.ceil(Math.random() * MAX_RESULTS);
	const paintingsCnt = Math.ceil(Math.random() * (MAX_RESULTS - graphicsCnt));
	const archivalsCnt = MAX_RESULTS - (graphicsCnt + paintingsCnt);

	const langGraphicItems = graphics[lang] ? graphics[lang] : graphics['en'];
	const langPaintingItems = paintings[lang] ? paintings[lang] : paintings['en'];
	const langArchivalItems = archivals[lang] ? archivals[lang] : archivals['en'];

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
})




app.listen(port, () => {
	console.log(`Listening on http://localhost:${port} ...`);
});