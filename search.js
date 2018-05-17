const fs = require('fs');
const wiki = require('wikijs').default;
const request = require('request-promise');

const inputFile = 'hits-full.json';

const solrHostAndCore = 'http://172.17.0.1:8983/solr/gettingstarted';
const qf = 'title_txt_en^10 headings_txt_en^5 categories_txts_en^2 opening_text_txt_en^2 text_txt_en^2';

let wikiClient = wiki({apiUrl: 'https://simple.wikipedia.org/w/api.php'});

let results = new Map();

let promises = [];

const ltrFeatureStoreName = "wikipedia";
const ltrFeatures = [
    {
        "store": ltrFeatureStoreName,
        "name": "documentRecency",
        "class": "org.apache.solr.ltr.feature.SolrFeature",
        "params": {
            "q": "{!func}recip( ms(NOW,last_updated_dt), 3.16e-11, 1, 1)"
        }
    },
    {
        "store": ltrFeatureStoreName,
        "name": "popularity",
        "class": "org.apache.solr.ltr.feature.FieldValueFeature",
        "params": {
            "field": "popularity_score_d"
        }
    },
    {
        "store": ltrFeatureStoreName,
        "name": "originalScore",
        "class": "org.apache.solr.ltr.feature.OriginalScoreFeature",
        "params": {}
    }
];

const ltrModelName = "wikipedia";
const ltrModel = {
    "class": "org.apache.solr.ltr.model.LinearModel",
    "name": ltrModelName,
    "store": ltrFeatureStoreName,
    "features": [
        {"name": "documentRecency"},
        {"name": "popularity"},
        {"name": "originalScore"}
    ],
    "params": {
        "weights": {
            "documentRecency": 0.1,
            "popularity": 1.1,
            "originalScore": 0.5
        }
    }
};

configureLtr().then(uploadLtrConfig).then(fireSearches);

function configureLtr() {
    return Promise.all([addLtrQueryParser(), addLtrFeatureTransformer()]);
}

function checkForLtrQueryParser() {
    console.debug('Checking for existence of LTR query parser.');

    return new Promise((resolve, reject) => {
        request(solrHostAndCore + '/config/queryParser').then((data) => {
            let queryParsers = JSON.parse(data);

            resolve(!!(queryParsers.config.queryParser && queryParsers.config.queryParser.ltr));
        }).catch((error) => {
            reject('Could not check existence of LTR query parser: ' + error);
        });
    });
}

function addLtrQueryParser() {
    checkForLtrQueryParser().then((ltrQueryParserExists) => {
        if (!ltrQueryParserExists) {
            console.log('Adding LTR query parser.');

            return request.post({
                url: solrHostAndCore + '/config',
                json: {
                    "add-queryparser": {
                        "name": "ltr",
                        "class": "org.apache.solr.ltr.search.LTRQParserPlugin"
                    }
                }
            }).then(() => {
                console.log('Successfully added LTR query parser.');
            }).catch((error) => {
                throw('Error adding LTR query parser: ' + error);
            });
        }
    });
}

function checkForLtrFeatureTransformer() {
    console.debug('Checking for existence of LTR feature transformer');

    return new Promise((resolve, reject) => {
        request(solrHostAndCore + '/config/transformer').then((data) => {
            let transformer = JSON.parse(data);

            resolve(!!(transformer.config.transformer && transformer.config.transformer.features));
        }).catch((error) => {
            reject('Could not check existence of LTR feature transformer: ' + error);
        });
    });
}

function addLtrFeatureTransformer() {
    checkForLtrFeatureTransformer().then((ltrFeatureTransformerExists) => {
        if (!ltrFeatureTransformerExists) {
            console.log('Adding LTR feature transformer.');

            return request.post({
                url: solrHostAndCore + '/config',
                json: {
                    "update-transformer": {
                        "name": "features",
                        "class": "org.apache.solr.ltr.response.transform.LTRFeatureLoggerTransformerFactory",
                        "fvCacheName": "QUERY_DOC_FV" // TODO: Configure this cache.
                    }
                }
            }).then(() => {
                console.log('Successfully added LTR feature transformer.');
            }).catch((error) => {
                throw('Error adding LTR feature transformer: ' + error);
            });
        }
    });
}

function uploadLtrConfig() {
    return deleteLtrFeatures().then(uploadLtrFeatures).then(deleteLtrModel).then(uploadLtrModel);
}

function deleteLtrFeatures() {
    console.debug('Deleting old LTR features.');

    return request.delete(solrHostAndCore + '/schema/feature-store/' + ltrFeatureStoreName).then(() => {
        console.debug('Successfully deleted old LTR features.');
    })
        .catch((error) => {
            throw('Could not delete old LTR features: ' + error);
        });
}

function uploadLtrFeatures() {
    console.debug('Uploading LTR features.');

    return request.put({url: solrHostAndCore + '/schema/feature-store', json: ltrFeatures}).then(() => {
        console.log('Successfully uploaded LTR features.');
    }).catch((error) => {
        throw('Could not upload LTR features: ' + error);
    });
}

function deleteLtrModel() {
    console.debug('Deleting old LTR model.');

    return request.delete(solrHostAndCore + '/schema/model-store/' + ltrModelName).then(() => {
        console.log('Successfully deleted old LTR model.');
    }).catch((error) => {
        throw('Could not delete old LTR model: ' + error);
    });
}

function uploadLtrModel() {
    console.debug('Uploading LTR model.');

    return request.put({url: solrHostAndCore + '/schema/model-store', json: ltrModel}).then(() => {
        console.log('Successfully uploaded LTR model.');
    }).catch((error) => {
        throw('Could not upload LTR model: ' + error);
    });
}

function fireSearches() {
    console.log('Firing searches');

    fs.readFile(inputFile, null, (error, contents) => {
        let data = JSON.parse(contents);
        Object.keys(data).forEach((query) => {

            results.set(query, new Map());

            let storedResults = data[query];
            let gradedRelevance = calculateGradedRelevance(storedResults);
            let idcg = calculateDcg(storedResults, gradedRelevance);

            promises.push(wikiClient.search(query).then((data) => {
                let ndcg = calculcateNdcg(data.results, gradedRelevance, idcg);
                results.get(query).set('wiki', ndcg);
            }).catch((error) => {
                throw(error);
            }));

            promises.push(request({
                url: solrHostAndCore + '/browse',
                qs: {q: query, wt: 'json', qf: qf, mm: '100%'}
            }).then((body) => {
                let jsonBody = JSON.parse(body);
                if (jsonBody.response.numFound > 0) {
                    let matches = jsonBody.response.docs.map((doc) => {
                        return doc.title_txt_en[0];
                    });
                    let ndcg = calculcateNdcg(matches, gradedRelevance, idcg);
                    results.get(query).set('solr', ndcg);
                }
            }).catch((error) => {
                throw(error);
            }));

            promises.push(request({
                url: solrHostAndCore + '/browse',
                qs: {q: query, wt: 'json', qf: qf, mm: '100%', rq: '{!ltr model=wikipedia reRankDocs=100}'}
            }).then((body) => {
                let jsonBody = JSON.parse(body);
                if (jsonBody.response.numFound > 0) {
                    let matches = jsonBody.response.docs.map((doc) => {
                        return doc.title_txt_en[0];
                    });
                    let ndcg = calculcateNdcg(matches, gradedRelevance, idcg);
                    results.get(query).set('ltr', ndcg);
                }
            }).catch((error) => {
                throw(error);
            }));
        });

        Promise.all(promises).then(() => {
            console.log(results);
        });
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
