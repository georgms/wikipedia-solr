const ltr = require('./ltr');
const solr = require('./solr');
const ndcg = require('./ndcg');

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

            let idealRanking = data[query];

            promises.push(searchSolr(query, idealRanking));
            promises = promises.concat(Object.keys(ltr.models).map((model) => {
                return searchSolrLtr(query, model, idealRanking);
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

function searchSolr(query, idealRanking) {
    return request({
        url: solr.hostAndCore + '/browse',
        qs: {q: query, wt: 'json', qf: solr.qf, mm: '100%'}
    }).then((body) => {
        let jsonBody = JSON.parse(body);
        if (jsonBody.response.numFound > 0) {
            let matches = jsonBody.response.docs.map((doc) => {
                return doc.title_txt_en[0];
            });
            results[query]['baseline'] = ndcg.calculate(matches, idealRanking);
        }
    }).catch((error) => {
        throw(error);
    });
}

function searchSolrLtr(query, model, idealRanking) {
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
            results[query][model] = ndcg.calculate(matches, idealRanking);
        }
    }).catch((error) => {
        throw(error);
    });
}


