const ltrMethods = require('./ltr');
const solr = require('./solr');

const fs = require('fs');
const request = require('request-promise');

const inputFile = 'hits.json';

let results = {};

let promises = [];

ltrMethods.configureLtr().then(ltrMethods.uploadLtrConfig).then(fireSearches);

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
            promises.push(searchSolrLtr(query, gradedRelevance, idcg));
        });

        Promise.all(promises).then(() => {
            displayResults(results);
        });
    });
}

function displayResults(results) {
    let output = "query;solr;ltr\n";

    output = Object.keys(results).reduce((output, query) => {
        let metrics = results[query];
        return output + [query, metrics.solr, metrics.ltr].join(';') + "\n";
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
            results[query]['solr'] = calculcateNdcg(matches, gradedRelevance, idcg);
        }
    }).catch((error) => {
        throw(error);
    });
}

function searchSolrLtr(query, gradedRelevance, idcg) {
    return request({
        url: solr.hostAndCore + '/browse',
        qs: {
            q: query,
            wt: 'json',
            qf: solr.qf,
            mm: '100%',
            rq: `{!ltr model=wikipedia reRankDocs=100 efi.text='\${q}'}`
        }
    }).then((body) => {
        let jsonBody = JSON.parse(body);
        if (jsonBody.response.numFound > 0) {
            let matches = jsonBody.response.docs.map((doc) => {
                return doc.title_txt_en[0];
            });
            results[query]['ltr'] = calculcateNdcg(matches, gradedRelevance, idcg);
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
