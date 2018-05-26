const ltr = require('./ltr');
const solr = require('./solr');

const fs = require('fs');
const request = require('request-promise');

const inputFile = 'hits.json';

let results = {};

let promises = [];

ltr.configureLtr().then(ltr.uploadLtrConfig).then(fireSearches);

function fireSearches() {
    console.log('Firing searches');

    fs.readFile(inputFile, null, (error, contents) => {
        let data = JSON.parse(contents);
        Object.keys(data).forEach((query) => {
            results[query] = {};

            let storedResults = data[query];
            let gradedRelevance = calculateGradedRelevance(storedResults);
            let idcg = calculateDcg(storedResults, gradedRelevance);

            promises.push(searchSolr(query, gradedRelevance, idcg));
            promises = promises.concat(Object.keys(ltr.models).map((model) => {
                return searchSolrLtr(query, gradedRelevance, idcg, model);
            }));
        });

        Promise.all(promises).then(() => {
            displayResults(results);
        });
    });
}

function displayResults(results) {
    let columns = ['query', 'baseline'];
    columns = columns.concat(Object.keys(ltr.models));
    let output = columns.join(';') + "\n";

    output = Object.keys(results).reduce((output, query) => {
        let metrics = results[query];
        let row = [query, metrics.baseline];
        row = row.concat(Object.keys(ltr.models).map((model) => {
            return metrics[model];
        }));
        return output + row.join(';') + "\n";
    }, output);

    console.log(output);
}

function searchSolr(query, gradedRelevance, idcg) {
    return request({
        url: solr.hostAndCore + '/browse',
        qs: {q: query, wt: 'json', qf: solr.qf, mm: '100%'}
    }).then((body) => {
        let jsonBody = JSON.parse(body);
        if (jsonBody.response.numFound > 0) {
            let matches = jsonBody.response.docs.map((doc) => {
                return doc.title_txt_en[0];
            });
            results[query]['baseline'] = calculcateNdcg(matches, gradedRelevance, idcg);
        }
    }).catch((error) => {
        throw(error);
    });
}

function searchSolrLtr(query, gradedRelevance, idcg, model) {
    return request({
        url: solr.hostAndCore + '/browse',
        qs: {
            q: query,
            wt: 'json',
            qf: solr.qf,
            mm: '100%',
            rq: `{!ltr model=${model} reRankDocs=100 efi.text='\${q}'}`
        }
    }).then((body) => {
        let jsonBody = JSON.parse(body);
        if (jsonBody.response.numFound > 0) {
            let matches = jsonBody.response.docs.map((doc) => {
                return doc.title_txt_en[0];
            });
            results[query][model] = calculcateNdcg(matches, gradedRelevance, idcg);
        }
    }).catch((error) => {
        throw(error);
    });
}

function calculateGradedRelevance(results) {
    let gradedRelevance = new Map();

    for (let i = 0; i < results.length; i++) {
        let storedResult = results[i];
        /* Set relevance to 100, 50, 33 … */
        gradedRelevance.set(storedResult, 100 / (i + 1));
    }

    return gradedRelevance;
}

function calculateDcg(results, gradedRelevance) {
    let dcg = 0;

    for (let i = 0; i < results.length; i++) {
        let result = results[i];
        let relevance = gradedRelevance.get(result) || 0;
        dcg += relevance / Math.log2(i + 2);
    }

    return dcg;
}

function calculcateNdcg(results, gradedRelevance, idcg) {
    let dcg = calculateDcg(results, gradedRelevance);
    return dcg / idcg;
}
