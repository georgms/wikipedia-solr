const fs = require('fs');
const wiki = require('wikijs').default;
const request = require('request-promise');

const inputFile = 'hits-full.json';

const solrHostAndCore = 'http://172.17.0.1:8983/solr/gettingstarted';
const qf = 'title_txt_en^10 headings_txt_en^5 categories_txts_en^2 opening_text_txt_en^2 text_txt_en^2';

let wikiClient = wiki({apiUrl: 'https://simple.wikipedia.org/w/api.php'});

let results = new Map();

let promises = [];

configureLtr();
uploadLtrFeatures();

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
    });

    Promise.all(promises).then(() => {
        console.log(results);
    });
});

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

function configureLtr() {
    addLtrQparserToSolr();
    addLtrFeatureTransformer();
}

function addLtrQparserToSolr() {
    console.debug('Checking for Solr LTRQparser.');

    /* Check if the LTRQParser is already configured. */
    request(solrHostAndCore + '/config/queryParser').then((data) => {
        let queryParsers = JSON.parse(data);
        if (queryParsers.config.queryParser && queryParsers.config.queryParser.ltr) {
            console.debug('Solr LTRQParser already configured.');
        } else {
            console.log('Adding Solr LTRQparser.');

            request.post({
                url: solrHostAndCore + '/config',
                json: {
                    "add-queryparser": {
                        "name": "ltr",
                        "class": "org.apache.solr.ltr.search.LTRQParserPlugin"
                    }
                }
            }).then((data) => {
                console.log('Successfully added Solr LTRQParser.');
            }).catch((error) => {
                console.error('Error adding Solr LTRQparser: ' + error);
            });
        }
    }).catch((error) => {
        throw('Could not check existence of LTRQParser: ' + error);
    });
}

function addLtrFeatureTransformer() {
    console.debug('Checking for Solr LTR feature transformer.');

    /* Check if the LTRQParser is already configured. */
    request(solrHostAndCore + '/config/transformer').then((data) => {
        let transformer = JSON.parse(data);
        if (transformer.config.transformer && transformer.config.transformer.features) {
            console.debug('Solr LTR feature transformer already configured.');
        } else {
            console.log('Adding Solr LTR feature transformer.');

            request.post({
                url: solrHostAndCore + '/config',
                json: {
                    "update-transformer": {
                        "name": "features",
                        "class": "org.apache.solr.ltr.response.transform.LTRFeatureLoggerTransformerFactory",
                        "fvCacheName": "QUERY_DOC_FV" // TODO: Configure this cache.
                    }
                }
            }).then((data) => {
                console.log('Successfully added Solr LTR feature transformer.');
            }).catch((error) => {
                console.error('Error adding Solr LTR feature transformer: ' + error);
            });
        }
    }).catch((error) => {
        throw('Could not check existence of Solr LTR feature transformer: ' + error);
    });
}

function uploadLtrFeatures() {
    let model = [
        {
            "name": "documentRecency",
            "class": "org.apache.solr.ltr.feature.SolrFeature",
            "params": {
                "q": "{!func}recip( ms(NOW,last_updated_dt), 3.16e-11, 1, 1)"
            }
        },
        {
            "name": "popularity",
            "class": "org.apache.solr.ltr.feature.FieldValueFeature",
            "params": {
                "field": "popularity_score_d"
            }
        },
        {
            "name": "originalScore",
            "class": "org.apache.solr.ltr.feature.OriginalScoreFeature",
            "params": {}
        }
    ];

    console.debug('Uploading LTR model.');

    request.post({url: solrHostAndCore + '/schema/feature-store', json: model}).then((data) => {
        console.log('Successfully uploaded LTR model.');
    }).catch((error) => {
        throw('Could not upload LTR model: ' + error);
    })
}