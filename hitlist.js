const fs = require('fs');
const readline = require('readline');
const wiki = require('wikijs').default;

/* A file containing a list of query to fetch result for, one query per line. */
const inputFile = 'queries.txt';
const outputFile = 'hits.json';

const rl = readline.createInterface({
    input: fs.createReadStream(inputFile)
});

let results = {};
let wikiClient = wiki({apiUrl: 'https://simple.wikipedia.org/w/api.php'});
let promises = [];

rl.on('line', query => {
    promises.push(wikiClient.search(query));
}).on('close', () => {
    Promise.all(promises).then(searchResults => {
        searchResults.forEach(searchResult => {
           results[searchResult.query] = searchResult.results;
        });
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    });
});

